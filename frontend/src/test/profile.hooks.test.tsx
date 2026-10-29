import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, type AxiosResponse } from "axios";
import { useForm } from "react-hook-form";

vi.mock("@/features/profile/service/profile.api", () => ({
  listProfilesAPI: vi.fn(),
  getProfileAPI: vi.fn(),
  createProfileAPI: vi.fn(),
  updateProfileAPI: vi.fn(),
  deleteProfileAPI: vi.fn(),
  draftFromResumeAPI: vi.fn(),
  getProfileVersionsAPI: vi.fn(),
  getCvUrlAPI: vi.fn(),
  uploadCvAPI: vi.fn(),
  parseResumeAPI: vi.fn(),
  getCompanySkillBarAPI: vi.fn(),
  getCalibrationAPI: vi.fn(),
  getTelegramStatusAPI: vi.fn(),
  createTelegramLinkAPI: vi.fn(),
  listJdRolesAPI: vi.fn(),
}));

import * as api from "@/features/profile/service/profile.api";
import { useProfiles } from "@/features/profile/Hooks/useProfiles";
import { useProfile } from "@/features/profile/Hooks/useProfile";
import { useSaveProfile } from "@/features/profile/Hooks/useSaveProfile";
import { useProfileJson } from "@/features/profile/Hooks/useProfileJson";
import { useCvUpload } from "@/features/profile/Hooks/useCvUpload";
import { useCalibration } from "@/features/profile/Hooks/useCalibration";
import { useCompanyBarOverlay } from "@/features/profile/Hooks/useCompanyBarOverlay";
import { useProfileDraft, DRAFT_PREFIX } from "@/features/profile/Hooks/useProfileDraft";
import { useSkillLevels } from "@/features/profile/Hooks/useSkillLevels";
import { useProfileVersions } from "@/features/profile/Hooks/useProfileVersions";
import { useTelegramLink } from "@/features/profile/Hooks/useTelegramLink";
import { useRoleSuggestions, DEFAULT_ROLES } from "@/features/profile/Hooks/useRoleSuggestions";
import { blankValues } from "@/features/profile/lib/formMapping";
import type { ProfileSummary, ProfileValues, StoredProfile } from "@/features/profile/lib/types";
import { makeStore, withStore } from "./utils";

const stored = (over: Partial<StoredProfile> = {}): StoredProfile => ({
  ...blankValues(),
  name: "Ana Lyst",
  email: "ana@example.com",
  id: "p1",
  version: 1,
  updated_at: "now",
  ...over,
});

const summary = (id: string): ProfileSummary => ({
  id,
  name: id,
  email: `${id}@x.test`,
  preferred_roles: [],
  levels: {} as ProfileSummary["levels"],
  completeness: 0,
  version: 1,
  updated_at: "now",
});

const axiosError = (status: number, data: unknown) =>
  new AxiosError("request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

afterEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
});

describe("useProfiles", () => {
  it("loads once, reuses the cache, and paginates", async () => {
    const list = vi.mocked(api.listProfilesAPI);
    list.mockResolvedValueOnce({ items: [summary("a")], next_cursor: "c1" });
    const store = makeStore();
    const { result } = renderHook(() => useProfiles({ q: "" }), { wrapper: withStore(store) });
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(["a"]));
    expect(result.current.hasMore).toBe(true);

    list.mockResolvedValueOnce({ items: [summary("b")], next_cursor: null });
    await act(() => result.current.loadMore());
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(list).toHaveBeenLastCalledWith({ q: "", limit: 20, cursor: "c1" });
    expect(result.current.hasMore).toBe(false);

    renderHook(() => useProfiles({ q: "" }), { wrapper: withStore(store) });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("reloads for a new search and exposes errors without looping", async () => {
    const list = vi.mocked(api.listProfilesAPI).mockRejectedValue(new Error("offline"));
    const { result, rerender } = renderHook(({ q }) => useProfiles({ q }), {
      wrapper: withStore(makeStore()),
      initialProps: { q: "" },
    });
    await waitFor(() => expect(result.current.error).toBe("offline"));
    expect(list).toHaveBeenCalledTimes(1);

    list.mockResolvedValue({ items: [summary("ana")], next_cursor: null });
    rerender({ q: "ana" });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(list).toHaveBeenLastCalledWith({ q: "ana", limit: 20 });
  });
});

describe("useProfile", () => {
  it("fetches by id and caches", async () => {
    const get = vi.mocked(api.getProfileAPI).mockResolvedValue({ profile: stored(), version: 1 });
    const store = makeStore();
    const { result } = renderHook(() => useProfile("p1"), { wrapper: withStore(store) });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.profile?.name).toBe("Ana Lyst"));
    expect(result.current.version).toBe(1);
    renderHook(() => useProfile("p1"), { wrapper: withStore(store) });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("surfaces a load error and does nothing without an id", async () => {
    vi.mocked(api.getProfileAPI).mockRejectedValue(new Error("not found"));
    const { result } = renderHook(() => useProfile("missing"), { wrapper: withStore(makeStore()) });
    await waitFor(() => expect(result.current.error).toBe("not found"));
    expect(result.current.profile).toBeNull();

    const none = renderHook(() => useProfile(undefined), { wrapper: withStore(makeStore()) });
    expect(none.result.current).toMatchObject({ profile: null, loading: false, error: null });
  });
});

describe("useSaveProfile", () => {
  const values = (): ProfileValues => ({
    ...blankValues(),
    name: "Ana Lyst",
    email: "ana@example.com",
  });

  it("creates when there is no context, sending the contract payload", async () => {
    const create = vi.mocked(api.createProfileAPI).mockResolvedValue(stored());
    const store = makeStore();
    const { result } = renderHook(() => useSaveProfile(), { wrapper: withStore(store) });
    let out: StoredProfile | null = null;
    await act(async () => {
      out = await result.current.save(values(), undefined, "json_import");
    });
    expect(out).toMatchObject({ id: "p1" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ana Lyst" }),
      "json_import",
    );
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("id");
    expect(store.getState().profile.byId["p1"]?.version).toBe(1);
  });

  it("updates with the expected version and the change source", async () => {
    const update = vi.mocked(api.updateProfileAPI).mockResolvedValue(stored({ version: 3 }));
    const { result } = renderHook(() => useSaveProfile(), { wrapper: withStore(makeStore()) });
    await act(async () => {
      await result.current.save(values(), { id: "p1", version: 2, source: "resume_import" });
    });
    expect(update).toHaveBeenCalledWith("p1", 2, expect.any(Object), "resume_import");
  });

  it("turns a 409 into an 'open existing' id", async () => {
    vi.mocked(api.createProfileAPI).mockRejectedValue(
      axiosError(409, { error: "dup", existing_profile_id: "p9" }),
    );
    const { result } = renderHook(() => useSaveProfile(), { wrapper: withStore(makeStore()) });
    await act(async () => {
      expect(await result.current.save(values())).toBeNull();
    });
    expect(result.current.duplicateId).toBe("p9");
    expect(result.current.error).toMatch(/already exists/);
  });

  it("keeps a 412 as a conflict: 'mine' re-saves on the server's version, 'theirs' returns it", async () => {
    const theirs = stored({ version: 4, name: "Their Edit" });
    vi.mocked(api.updateProfileAPI).mockRejectedValueOnce(
      axiosError(412, { error: "stale", current: theirs, current_version: 4 }),
    );
    const store = makeStore();
    const { result } = renderHook(() => useSaveProfile(), { wrapper: withStore(store) });
    await act(async () => {
      expect(await result.current.save(values(), { id: "p1", version: 3 })).toBeNull();
    });
    expect(result.current.conflict?.version).toBe(4);

    vi.mocked(api.updateProfileAPI).mockResolvedValueOnce(stored({ version: 5 }));
    await act(async () => {
      await result.current.resolveConflict("mine");
    });
    expect(api.updateProfileAPI).toHaveBeenLastCalledWith("p1", 4, expect.any(Object), undefined);
    expect(result.current.conflict).toBeNull();

    vi.mocked(api.updateProfileAPI).mockRejectedValueOnce(
      axiosError(412, { error: "stale", current: theirs, current_version: 4 }),
    );
    await act(async () => {
      await result.current.save(values(), { id: "p1", version: 5 });
    });
    let loaded: StoredProfile | null = null;
    await act(async () => {
      loaded = await result.current.resolveConflict("theirs");
    });
    expect(loaded).toMatchObject({ name: "Their Edit" });
    expect(store.getState().profile.current.conflict).toBeNull();
  });

  it("reports other failures", async () => {
    vi.mocked(api.createProfileAPI).mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useSaveProfile(), { wrapper: withStore(makeStore()) });
    await act(async () => {
      await result.current.save(values());
    });
    expect(result.current.error).toBe("network down");
    expect(result.current.saving).toBe(false);
  });
});

describe("useProfileJson", () => {
  const file = (text: string, name = "p.json") =>
    new File([text], name, { type: "application/json" });

  it("imports a valid profile and reports path-level errors for a bad one", async () => {
    const { result } = renderHook(() => useProfileJson());
    const good = await result.current.importJson(
      file(
        JSON.stringify(blankValues())
          .replace('"name":""', '"name":"Ana Lyst"')
          .replace('"email":""', '"email":"ana@example.com"'),
      ),
    );
    expect(good.ok).toBe(true);

    const bad = await result.current.importJson(
      file(JSON.stringify({ ...blankValues(), name: "A", email: "nope" })),
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok)
      expect(bad.errors.map((e) => e.path)).toEqual(expect.arrayContaining(["name", "email"]));
  });

  it("rejects invalid JSON, big files and other schema majors", async () => {
    const { result } = renderHook(() => useProfileJson());
    const notJson = await result.current.importJson(file("{nope"));
    expect(notJson).toEqual({
      ok: false,
      errors: [{ path: "", message: "That file is not valid JSON" }],
    });

    const big = new File([new Uint8Array(1024 * 1024 + 1)], "big.json");
    const tooBig = await result.current.importJson(big);
    expect(tooBig.ok).toBe(false);

    const v2 = await result.current.importJson(
      file(JSON.stringify({ ...blankValues(), schema_version: "2.0" })),
    );
    expect(v2.ok).toBe(false);
    if (!v2.ok) expect(v2.errors[0]?.path).toBe("schema_version");
  });

  it("exports the contract object under profile.<slug>.json", () => {
    const created: Blob[] = [];
    const urlApi = URL as unknown as Record<string, unknown>;
    urlApi["createObjectURL"] = (b: Blob) => (created.push(b), "blob:x");
    urlApi["revokeObjectURL"] = () => undefined;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const { result } = renderHook(() => useProfileJson());
    const name = result.current.exportJson({ ...blankValues(), name: "Ana Lyst" });
    expect(name).toBe("profile.ana-lyst.json");
    expect(click).toHaveBeenCalled();
    expect(created).toHaveLength(1);
    click.mockRestore();
  });
});

describe("useCvUpload", () => {
  it("validates, uploads and derives the stored path", async () => {
    vi.mocked(api.uploadCvAPI).mockResolvedValue({ document_id: "d1", sha256: "abc" });
    const { result } = renderHook(() => useCvUpload());
    await act(async () => {
      expect(await result.current.upload(new File(["x"], "cv.txt"))).toBeNull();
    });
    expect(result.current.error).toMatch(/PDF or Word/);

    await act(async () => {
      await result.current.upload(new File(["x"], "cv.pdf", { type: "application/pdf" }));
    });
    expect(result.current.cvFile).toBe("resume/abc.pdf");
    expect(result.current.documentId).toBe("d1");
    expect(result.current.error).toBeNull();
  });

  it("reports upload failures", async () => {
    vi.mocked(api.uploadCvAPI).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useCvUpload());
    await act(async () => {
      await result.current.upload(new File(["x"], "cv.pdf", { type: "application/pdf" }));
    });
    expect(result.current.error).toBe("boom");
    expect(result.current.uploading).toBe(false);
  });
});

describe("useCalibration", () => {
  const cal = {
    code: "DSA" as const,
    level: 5,
    source: "seed" as const,
    levels: [
      { level: 4, topics: ["a", "b"] },
      { level: 5, topics: ["c", "d"] },
    ],
  };

  it("loads the window, tracks ticks and suggests a level", async () => {
    vi.mocked(api.getCalibrationAPI).mockResolvedValue(cal);
    const { result } = renderHook(() => useCalibration("DSA", 5));
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.suggested).toBe(3);
    act(() => {
      result.current.toggle(4, 0);
      result.current.toggle(4, 1);
    });
    expect(result.current.suggested).toBe(4);
    expect(result.current.basis).toBe("Self-check: 2/4 topics around level 5");
    act(() => result.current.toggle(4, 1));
    expect(result.current.ticked.has("4:1")).toBe(false);
  });

  it("does nothing while disabled and reports errors", async () => {
    const get = vi.mocked(api.getCalibrationAPI).mockRejectedValue(new Error("nope"));
    const off = renderHook(() => useCalibration(null, 5));
    expect(get).not.toHaveBeenCalled();
    expect(off.result.current.available).toBe(false);

    const { result } = renderHook(() => useCalibration("SQL", 5));
    await waitFor(() => expect(result.current.error).toBe("nope"));
  });
});

describe("useCompanyBarOverlay", () => {
  const rows = [
    "COD",
    "DSA",
    "APTI",
    "COMM",
    "OOD",
    "AI",
    "SQL",
    "SYSD",
    "CLOUD",
    "SWE",
    "NETW",
    "OS",
  ].map((c, i) => ({
    company_id: 4,
    company_name: "Google",
    skill_set_id: i + 1,
    category_code: c,
    required_level: 6,
  }));

  it("loads a company's bar once and stays off without a company", async () => {
    const get = vi.mocked(api.getCompanySkillBarAPI).mockResolvedValue(rows);
    const { result, rerender } = renderHook(({ id }) => useCompanyBarOverlay(id), {
      initialProps: { id: 4 as number | null },
    });
    await waitFor(() => expect(result.current.bar?.COD).toBe(6));
    rerender({ id: null });
    expect(result.current.bar).toBeNull();
    rerender({ id: 4 });
    await waitFor(() => expect(result.current.bar?.COD).toBe(6));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("is unavailable (never throws) when the route fails", async () => {
    vi.mocked(api.getCompanySkillBarAPI).mockRejectedValue(new Error("404"));
    const { result } = renderHook(() => useCompanyBarOverlay(78));
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.bar).toBeNull();
  });
});

describe("useProfileVersions and useRoleSuggestions", () => {
  it("loads history only when opened", async () => {
    const get = vi.mocked(api.getProfileVersionsAPI).mockResolvedValue([]);
    const { rerender } = renderHook(({ open }) => useProfileVersions("p1", open), {
      initialProps: { open: false },
    });
    expect(get).not.toHaveBeenCalled();
    rerender({ open: true });
    await waitFor(() => expect(get).toHaveBeenCalledWith("p1"));
  });

  it("suggests the JD roles on top of the defaults, and falls back to the defaults", async () => {
    vi.mocked(api.listJdRolesAPI).mockResolvedValue(["Site Reliability Engineer"]);
    const { result } = renderHook(() => useRoleSuggestions());
    await waitFor(() => expect(result.current[0]).toBe("Site Reliability Engineer"));
    expect(result.current).toEqual(expect.arrayContaining(DEFAULT_ROLES));

    vi.mocked(api.listJdRolesAPI).mockRejectedValue(new Error("no route"));
    const fallback = renderHook(() => useRoleSuggestions());
    expect(fallback.result.current).toEqual(DEFAULT_ROLES);
  });
});

describe("useSkillLevels", () => {
  const setup = (mutate?: (v: ProfileValues) => void) => {
    const v = blankValues();
    v.skill_levels.COD = {
      level: 6,
      source: "resume_inferred",
      confidence: "high",
      basis: "3 skills in projects",
      inferred_level: 6,
    };
    mutate?.(v);
    return renderHook(() => {
      const form = useForm<ProfileValues>({ defaultValues: v });
      // formState is a subscription proxy: it must be read while rendering.
      const { isDirty } = form.formState;
      return { form, isDirty, sl: useSkillLevels(form) };
    });
  };

  it("moving a slider makes the value self-rated and remembers the resume's number", () => {
    const { result } = setup();
    act(() => result.current.sl.setLevel("COD", 8));
    expect(result.current.form.getValues("skill_levels.COD")).toEqual({
      level: 8,
      source: "self",
      confidence: "medium",
      basis: "Adjusted by candidate (resume suggested 6)",
      inferred_level: 6,
    });
    expect(result.current.isDirty).toBe(true);
  });

  it("setting the same level changes nothing", () => {
    const { result } = setup();
    act(() => result.current.sl.setLevel("COD", 6));
    expect(result.current.form.getValues("skill_levels.COD").source).toBe("resume_inferred");
  });

  it("reset restores the resume value with the original basis", () => {
    const { result } = setup();
    act(() => result.current.sl.setLevel("COD", 9));
    act(() => result.current.sl.resetToInferred("COD"));
    expect(result.current.form.getValues("skill_levels.COD")).toEqual({
      level: 6,
      source: "resume_inferred",
      confidence: "high",
      basis: "3 skills in projects",
      inferred_level: 6,
    });
  });

  it("reset does nothing when there is no resume value to go back to", () => {
    const { result } = setup((v) => {
      v.skill_levels.DSA = {
        level: 5,
        source: "self",
        confidence: "medium",
        basis: "mine",
        inferred_level: null,
      };
    });
    act(() => result.current.sl.resetToInferred("DSA"));
    expect(result.current.form.getValues("skill_levels.DSA").level).toBe(5);
  });

  it("warns (softly) when a self rating is 3 or more above the resume", () => {
    const { result } = setup();
    act(() => result.current.sl.setLevel("COD", 8));
    expect(result.current.sl.isHighSelfRating("COD")).toBe(false);
    act(() => result.current.sl.setLevel("COD", 9));
    expect(result.current.sl.isHighSelfRating("COD")).toBe(true);
    expect(result.current.sl.isHighSelfRating("DSA")).toBe(false);
  });

  it("no warning when the resume level had low confidence", () => {
    const { result } = setup((v) => {
      v.skill_levels.COD = {
        level: 2,
        source: "resume_inferred",
        confidence: "low",
        basis: "listed",
        inferred_level: 2,
      };
    });
    act(() => result.current.sl.setLevel("COD", 9));
    expect(result.current.sl.isHighSelfRating("COD")).toBe(false);
  });

  it("calibration records how the level was measured; assessed is capped at 8", () => {
    const { result } = setup();
    act(() =>
      result.current.sl.applyCalibration("COD", {
        level: 7,
        source: "self",
        basis: "Self-check: 7/9 topics around level 6",
      }),
    );
    expect(result.current.form.getValues("skill_levels.COD")).toMatchObject({
      level: 7,
      source: "self",
      confidence: "medium",
    });
    act(() =>
      result.current.sl.applyCalibration("COD", { level: 10, source: "assessed", basis: "quiz" }),
    );
    expect(result.current.form.getValues("skill_levels.COD")).toMatchObject({
      level: 8,
      source: "assessed",
    });
  });
});

describe("useProfileDraft", () => {
  const render = (key = "new") =>
    renderHook(() => {
      const form = useForm<ProfileValues>({ defaultValues: blankValues() });
      return { form, draft: useProfileDraft(form, key) };
    });

  it("autosaves unsaved edits (debounced) and clears on demand", async () => {
    vi.useFakeTimers();
    try {
      const { result } = render();
      act(() => result.current.form.setValue("name", "Ana", { shouldDirty: true }));
      expect(window.localStorage.getItem(DRAFT_PREFIX + "new")).toBeNull();
      act(() => void vi.advanceTimersByTime(900));
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_PREFIX + "new") as string) as {
        values: ProfileValues;
      };
      expect(saved.values.name).toBe("Ana");
      act(() => result.current.draft.clear());
      expect(window.localStorage.getItem(DRAFT_PREFIX + "new")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers to restore a saved draft, and discarding removes it", () => {
    const values = { ...blankValues(), name: "Restored Name" };
    window.localStorage.setItem(
      DRAFT_PREFIX + "p1",
      JSON.stringify({ savedAt: "2026-10-28T10:42:00.000Z", values }),
    );
    const { result } = render("p1");
    expect(result.current.draft.restorable).toEqual({ savedAt: "2026-10-28T10:42:00.000Z" });
    act(() => result.current.draft.restore());
    expect(result.current.form.getValues("name")).toBe("Restored Name");
    expect(result.current.draft.restorable).toBeNull();

    window.localStorage.setItem(DRAFT_PREFIX + "p2", JSON.stringify({ savedAt: "t", values }));
    const other = render("p2");
    act(() => other.result.current.draft.discard());
    expect(window.localStorage.getItem(DRAFT_PREFIX + "p2")).toBeNull();
  });

  it("ignores a corrupt draft", () => {
    window.localStorage.setItem(DRAFT_PREFIX + "bad", "{not json");
    expect(render("bad").result.current.draft.restorable).toBeNull();
  });
});

describe("useTelegramLink", () => {
  const link = {
    code: "abc123abc123",
    url: "https://t.me/test_bot?start=abc123abc123",
    expires_at: "2026-10-29T10:00:00.000Z",
  };

  it("is off until the backend says the bot is running", async () => {
    vi.mocked(api.getTelegramStatusAPI).mockResolvedValue({ enabled: false, username: null });
    const { result } = renderHook(() => useTelegramLink("p1"));
    await waitFor(() => expect(api.getTelegramStatusAPI).toHaveBeenCalled());
    expect(result.current.enabled).toBe(false);
  });

  it("stays off when the status request fails (an older backend), and for an unsaved profile", async () => {
    vi.mocked(api.getTelegramStatusAPI).mockRejectedValue(new Error("404"));
    const { result } = renderHook(() => useTelegramLink("p1"));
    await waitFor(() => expect(api.getTelegramStatusAPI).toHaveBeenCalled());
    expect(result.current.enabled).toBe(false);

    vi.mocked(api.getTelegramStatusAPI).mockClear();
    const unsaved = renderHook(() => useTelegramLink(undefined));
    expect(api.getTelegramStatusAPI).not.toHaveBeenCalled();
    expect(await unsaved.result.current.connect()).toBeNull();
  });

  it("creates a one-time link and opens it in a new tab without giving it a handle on this page", async () => {
    vi.mocked(api.getTelegramStatusAPI).mockResolvedValue({ enabled: true, username: "test_bot" });
    vi.mocked(api.createTelegramLinkAPI).mockResolvedValue(link);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { result } = renderHook(() => useTelegramLink("p1"));
    await waitFor(() => expect(result.current.enabled).toBe(true));

    let out: unknown = null;
    await act(async () => {
      out = await result.current.connect();
    });
    expect(api.createTelegramLinkAPI).toHaveBeenCalledWith("p1");
    expect(open).toHaveBeenCalledWith(link.url, "_blank", "noopener,noreferrer");
    expect(out).toEqual(link);
    expect(result.current.connecting).toBe(false);
    open.mockRestore();
  });

  it("does not open anything when the backend refuses", async () => {
    vi.mocked(api.getTelegramStatusAPI).mockResolvedValue({ enabled: true, username: "test_bot" });
    vi.mocked(api.createTelegramLinkAPI).mockRejectedValue(
      new Error("The Telegram bot is not running."),
    );
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { result } = renderHook(() => useTelegramLink("p1"));
    await waitFor(() => expect(result.current.enabled).toBe(true));
    await act(async () => {
      expect(await result.current.connect()).toBeNull();
    });
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
