import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/features/companies/service/companies.api", () => ({ getCompaniesAPI: vi.fn() }));
vi.mock("@/features/intelligence/service/intelligence.api", () => ({
  getCompanyProfileAPI: vi.fn(),
}));
vi.mock("@/features/skills/service/skills.api", () => ({ getCompanySkillsAPI: vi.fn() }));

import * as companiesApi from "@/features/companies/service/companies.api";
import * as intelligenceApi from "@/features/intelligence/service/intelligence.api";
import * as skillsApi from "@/features/skills/service/skills.api";
import {
  STORAGE_KEY,
  readSelectedCompany,
  useCompanies,
  useCompany,
} from "@/features/companies/Hooks/companies.hooks";
import { useCompanyProfile } from "@/features/intelligence/Hooks/intelligence.hooks";
import { useCompanySkills } from "@/features/skills/Hooks/skills.hooks";
import { makeStore, profile, summary, withStore } from "./utils";

afterEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
});

describe("useCompanies", () => {
  it("loads the list once and shares it through the store", async () => {
    const api = vi.mocked(companiesApi.getCompaniesAPI).mockResolvedValue([summary()]);
    const store = makeStore();
    const { result } = renderHook(() => useCompanies(), { wrapper: withStore(store) });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual([summary()]));
    expect(result.current.isLoading).toBe(false);

    // A second consumer reuses the cached list.
    renderHook(() => useCompanies(), { wrapper: withStore(store) });
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("exposes the error and recovers on refetch", async () => {
    const api = vi.mocked(companiesApi.getCompaniesAPI).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useCompanies(), { wrapper: withStore(makeStore()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe("offline");

    api.mockResolvedValueOnce([summary({ id: 2 })]);
    await act(() => result.current.refetch());
    expect(result.current.isError).toBe(false);
    expect(result.current.data[0]?.id).toBe(2);
    // The retry must not also fire a second request from the effect.
    expect(api).toHaveBeenCalledTimes(2);
  });
});

describe("selected company", () => {
  it.each([
    ["nothing saved", null],
    ["broken JSON", "{oops"],
    ["wrong shape", JSON.stringify({ companyId: "1", companyName: "x" })],
    ["non-positive id", JSON.stringify({ companyId: 0, companyName: "x" })],
  ])("readSelectedCompany ignores %s", (_label, raw) => {
    if (raw !== null) window.localStorage.setItem(STORAGE_KEY, raw);
    expect(readSelectedCompany()).toBeNull();
  });

  it("restores a saved company and persists a new pick", async () => {
    const saved = { companyId: 4, companyName: "Saved", logoUrl: "" };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => useCompany(), { wrapper: withStore(makeStore()) });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.selected).toEqual(saved);

    const next = { companyId: 5, companyName: "Next", logoUrl: "" };
    act(() => result.current.selectCompany(next));
    expect(result.current.selected).toEqual(next);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(next);
  });
});

describe("useCompanyProfile", () => {
  it("does nothing without a valid id", () => {
    const api = vi.mocked(intelligenceApi.getCompanyProfileAPI);
    for (const id of [undefined, null, 0, -3]) {
      const { result } = renderHook(() => useCompanyProfile(id), {
        wrapper: withStore(makeStore()),
      });
      expect(result.current).toMatchObject({ data: null, isLoading: false, isError: false });
    }
    expect(api).not.toHaveBeenCalled();
  });

  it("fetches once per company and caches it", async () => {
    const api = vi.mocked(intelligenceApi.getCompanyProfileAPI).mockResolvedValue(profile());
    const store = makeStore();
    const { result } = renderHook(() => useCompanyProfile(7), { wrapper: withStore(store) });
    await waitFor(() => expect(result.current.data?.name).toBe("Acme Corp"));
    renderHook(() => useCompanyProfile(7), { wrapper: withStore(store) });
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith(7);
  });

  it("reports an error", async () => {
    vi.mocked(intelligenceApi.getCompanyProfileAPI).mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useCompanyProfile(7), { wrapper: withStore(makeStore()) });
    await waitFor(() => expect(result.current.error).toBe("500"));
    expect(result.current.isLoading).toBe(false);
  });

  it("retries with exactly one new request", async () => {
    const api = vi
      .mocked(intelligenceApi.getCompanyProfileAPI)
      .mockRejectedValueOnce(new Error("500"));
    const { result } = renderHook(() => useCompanyProfile(8), { wrapper: withStore(makeStore()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    api.mockResolvedValueOnce(profile());
    await act(() => result.current.refetch());
    expect(result.current.data?.name).toBe("Acme Corp");
    expect(api).toHaveBeenCalledTimes(2);
  });
});

describe("useCompanySkills", () => {
  it("loads skills for a company", async () => {
    const data = { skills: [], topics: { 1: ["a"] } };
    vi.mocked(skillsApi.getCompanySkillsAPI).mockResolvedValue(data);
    const { result } = renderHook(() => useCompanySkills(3), { wrapper: withStore(makeStore()) });
    await waitFor(() => expect(result.current.data).toEqual(data));
  });

  it("reports an error and clears it on a successful refetch", async () => {
    const api = vi.mocked(skillsApi.getCompanySkillsAPI).mockRejectedValueOnce(new Error("nope"));
    const { result } = renderHook(() => useCompanySkills(3), { wrapper: withStore(makeStore()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    api.mockResolvedValueOnce({ skills: [], topics: {} });
    await act(() => result.current.refetch());
    expect(result.current.isError).toBe(false);
    expect(api).toHaveBeenCalledTimes(2);
  });
});
