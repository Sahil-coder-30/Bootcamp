import { beforeEach, describe, expect, it } from "vitest";
import { candidateProfileInputSchema, type CandidateProfileInput } from "../src/contract/profile.schema.js";
import { SEED_PROFILES } from "../src/data/seedProfiles/index.js";
import { HttpError } from "../src/middlewares/errorHandler.js";
import { createMemoryRepo } from "../src/services/profiles.repository.js";
import { createProfilesService, type ProfilesService } from "../src/services/profiles.service.js";

const ANANYA = "3a000000-0000-4000-8000-000000000001";
const ANANYA_V2 = "e1000000-0000-4000-8000-000000000003";

function input(over: Partial<CandidateProfileInput> = {}): CandidateProfileInput {
  const { id: _id, version: _v, updated_at: _u, ...rest } = structuredClone(SEED_PROFILES[0]!);
  return candidateProfileInputSchema.parse({ ...rest, ...over });
}

const failure = async (p: Promise<unknown>): Promise<HttpError> => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    return e as HttpError;
  }
  throw new Error("expected a rejection");
};

let svc: ProfilesService;
beforeEach(() => {
  svc = createProfilesService(createMemoryRepo());
});

describe("create", () => {
  it("stores version 1 with server fields and the change source", async () => {
    const p = await svc.create(input({ name: "New Person", email: "new.person@example.com" }), "json_import");
    expect(p).toMatchObject({ version: 1, name: "New Person", email: "new.person@example.com" });
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await svc.versions(p.id))[0]).toMatchObject({ version: 1, change_source: "json_import" });
  });

  it("rejects a duplicate email with 409 and the existing id", async () => {
    const e = await failure(svc.create(input()));
    expect(e.status).toBe(409);
    expect(e.extra).toEqual({ existing_profile_id: ANANYA });
  });
});

describe("update (optimistic concurrency)", () => {
  it("increments the version and records history", async () => {
    const v2 = await svc.update(ANANYA, 1, input({ name: "Ananya R Rao" }), "form");
    expect(v2.version).toBe(2);
    expect(v2.name).toBe("Ananya R Rao");
    const v3 = await svc.update(ANANYA, 2, input({ name: "Ananya Rao" }), "calibration");
    expect(v3.version).toBe(3);
    const history = await svc.versions(ANANYA);
    expect(history.map((h) => [h.version, h.change_source])).toEqual([
      [3, "calibration"],
      [2, "form"],
      [1, "seed"],
    ]);
  });

  it("returns 412 with the current profile when the version is stale", async () => {
    await svc.update(ANANYA, 1, input({ name: "Changed Once" }));
    const e = await failure(svc.update(ANANYA, 1, input({ name: "Mine" })));
    expect(e.status).toBe(412);
    expect(e.extra).toMatchObject({ current_version: 2, current: { name: "Changed Once", version: 2 } });
  });

  it("returns 404 for an unknown profile", async () => {
    const e = await failure(svc.update("3a000000-0000-4000-8000-0000000000ff", 1, input()));
    expect(e.status).toBe(404);
  });

  it("rejects moving to an email that belongs to another profile", async () => {
    const e = await failure(svc.update(ANANYA, 1, input({ email: "karthik.subramaniam@example.com" })));
    expect(e.status).toBe(409);
    expect(e.extra).toEqual({ existing_profile_id: "3a000000-0000-4000-8000-000000000002" });
  });

  it("two concurrent saves: exactly one wins, the other gets 412", async () => {
    const results = await Promise.allSettled([
      svc.update(ANANYA, 1, input({ name: "Writer One" })),
      svc.update(ANANYA, 1, input({ name: "Writer Two" })),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as HttpError).status).toBe(412);
  });
});

describe("list", () => {
  it("returns summaries with the 12 levels", async () => {
    const { items, next_cursor } = await svc.list({ limit: 20 });
    expect(items).toHaveLength(4);
    expect(next_cursor).toBeNull();
    const ananya = items.find((i) => i.id === ANANYA)!;
    expect(Object.keys(ananya.levels)).toHaveLength(12);
    expect(ananya).toMatchObject({ completeness: 90, version: 1, levels: { COD: 7, AI: 3 } });
  });

  it("paginates with a stable keyset cursor, even when new rows arrive", async () => {
    for (let i = 0; i < 5; i++) {
      await svc.create(input({ name: `Extra Person ${i}`, email: `extra${i}@example.com` }));
    }
    const first = await svc.list({ limit: 4 });
    expect(first.items).toHaveLength(4);
    expect(first.next_cursor).not.toBeNull();
    await svc.create(input({ name: "Late Arrival", email: "late@example.com" }));
    const second = await svc.list({ limit: 4, cursor: first.next_cursor! });
    const third = await svc.list({ limit: 4, cursor: second.next_cursor! });
    const ids = [...first.items, ...second.items, ...third.items].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(9);
    expect(third.next_cursor).toBeNull();
  });

  it("filters by name search and exact email", async () => {
    expect((await svc.list({ limit: 20, q: "ana" })).items.map((i) => i.name)).toEqual(["Ananya Rao"]);
    expect((await svc.list({ limit: 20, email: "priya.menon@example.com" })).items).toHaveLength(1);
    expect((await svc.list({ limit: 20, email: "nobody@example.com" })).items).toHaveLength(0);
  });

  it("rejects a malformed cursor with 400", async () => {
    expect((await failure(svc.list({ limit: 5, cursor: "garbage" }))).status).toBe(400);
  });
});

describe("draftFromResume", () => {
  it("returns a draft, no diff, and the existing profile when the email matches", async () => {
    const out = await svc.draftFromResume("e1000000-0000-4000-8000-000000000001");
    expect(out.diff).toBeNull();
    expect(out.existing_profile_id).toBe(ANANYA);
    expect(out.draft.name).toBe("Ananya Rao");
    expect(Object.keys(out.draft.skill_levels)).toHaveLength(12);
    expect(out.draft).not.toHaveProperty("id");
  });

  it("has no existing profile when the email is new", async () => {
    const empty = createProfilesService(createMemoryRepo([]));
    expect((await empty.draftFromResume("e1000000-0000-4000-8000-000000000002")).existing_profile_id).toBeNull();
  });

  it("merges into the named profile and returns the diff", async () => {
    const out = await svc.draftFromResume(ANANYA_V2, ANANYA);
    expect(out.existing_profile_id).toBe(ANANYA);
    expect(out.draft.id).toBe(ANANYA);
    expect(out.diff?.some((d) => d.kind === "add" && d.path.startsWith("internships."))).toBe(true);
    expect(out.draft.internships.at(-1)?.org).toBe("Bolt Cloud");
    expect(out.draft).not.toHaveProperty("version");
    expect(out.draft).not.toHaveProperty("updated_at");
  });

  it("gives an empty diff when the same resume is imported twice", async () => {
    const first = await svc.draftFromResume(ANANYA_V2, ANANYA);
    const { id: _id, ...draft } = first.draft;
    const saved = await svc.update(ANANYA, 1, candidateProfileInputSchema.parse(draft), "resume_import");
    const again = await svc.draftFromResume(ANANYA_V2, saved.id);
    expect(again.diff).toEqual([]);
  });

  it("is 404 for an unknown extraction or profile and 422 for a non-resume", async () => {
    expect((await failure(svc.draftFromResume("e1000000-0000-4000-8000-0000000000ff"))).status).toBe(404);
    expect((await failure(svc.draftFromResume(ANANYA_V2, "3a000000-0000-4000-8000-0000000000ff"))).status).toBe(404);
    const jd = createProfilesService(createMemoryRepo(), {
      getResumeExtraction: async (id) => ({
        id,
        document_id: null,
        result: { source_type: "jd", source_file: "jd.pdf", skills: [] },
      }),
      getDocumentStoragePath: async () => null,
    });
    expect((await failure(jd.draftFromResume(ANANYA_V2))).status).toBe(422);
  });

  it("uses the document storage path for cv_file", async () => {
    const withCv = createProfilesService(createMemoryRepo([]), {
      getResumeExtraction: async (id) => ({
        id,
        document_id: "doc-1",
        result: { source_type: "resume", source_file: "r.pdf", skills: [], candidate: { name: "Zed Zed", email: "z@example.com" } },
      }),
      getDocumentStoragePath: async () => "resume/abc123.pdf",
    });
    expect((await withCv.draftFromResume(ANANYA_V2)).draft.cv_file).toBe("resume/abc123.pdf");
  });
});

describe("remove, cvUrl and get", () => {
  it("deletes the profile and its history", async () => {
    await svc.remove(ANANYA);
    expect((await failure(svc.get(ANANYA))).status).toBe(404);
    expect((await failure(svc.versions(ANANYA))).status).toBe(404);
    expect((await failure(svc.remove(ANANYA))).status).toBe(404);
  });

  it("cvUrl is 404 without a CV and 503 without storage", async () => {
    const noStorage = createProfilesService(createMemoryRepo(), undefined, null);
    expect((await failure(noStorage.cvUrl(ANANYA))).status).toBe(404);
    const withCv = await noStorage.update(ANANYA, 1, input({ cv_file: "resume/abc.pdf" }));
    expect((await failure(noStorage.cvUrl(withCv.id))).status).toBe(503);
  });

  it("cvUrl returns a signed url, and 404 when the object is missing", async () => {
    const calls: string[] = [];
    const storage = {
      signedUrl: async (path: string) => (path.endsWith("gone.pdf") ? null : `https://files.test/${path}?sig=1`),
      remove: async (path: string) => void calls.push(path),
    };
    const s = createProfilesService(createMemoryRepo(), undefined, storage);
    await s.update(ANANYA, 1, input({ cv_file: "resume/abc.pdf" }));
    expect(await s.cvUrl(ANANYA)).toEqual({ url: "https://files.test/resume/abc.pdf?sig=1", expires_in: 600 });
    await s.update(ANANYA, 2, input({ cv_file: "resume/gone.pdf" }));
    expect((await failure(s.cvUrl(ANANYA))).status).toBe(404);
  });

  it("remove deletes the CV object too, and survives a storage error", async () => {
    const removed: string[] = [];
    const s = createProfilesService(createMemoryRepo(), undefined, {
      signedUrl: async () => null,
      remove: async (p) => {
        removed.push(p);
        throw new Error("object missing");
      },
    });
    await s.update(ANANYA, 1, input({ cv_file: "resume/abc.pdf" }));
    await s.remove(ANANYA);
    expect(removed).toEqual(["resume/abc.pdf"]);
    expect((await failure(s.get(ANANYA))).status).toBe(404);
  });

  it("get returns the row's server fields", async () => {
    expect(await svc.get(ANANYA)).toMatchObject({ id: ANANYA, version: 1 });
  });
});
