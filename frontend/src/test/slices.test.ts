import companies, {
  setCompaniesError,
  setCompaniesList,
  setCompaniesLoading,
  setSelectedCompany,
} from "@/features/companies/slice/companies.slice";
import intelligence, {
  setProfile,
  setProfileError,
  setProfileLoading,
} from "@/features/intelligence/slice/intelligence.slice";
import skills, { setCompanySkills, setSkillsError } from "@/features/skills/slice/skills.slice";
import { profile, summary } from "./utils";

const init = <S>(reducer: (s: S | undefined, a: { type: string }) => S) =>
  reducer(undefined, { type: "@@init" });

describe("companies slice", () => {
  it("stores the list and clears the error", () => {
    let s = companies(init(companies), setCompaniesError("down"));
    expect(s).toMatchObject({ error: "down", loading: false });
    s = companies(s, setCompaniesList([summary()]));
    expect(s).toMatchObject({ list: [summary()], loaded: true, error: null });
  });

  it("tracks loading and marks the selection as hydrated", () => {
    let s = companies(init(companies), setCompaniesLoading(true));
    expect(s.loading).toBe(true);
    s = companies(s, setSelectedCompany(null));
    expect(s).toMatchObject({ selected: null, hydrated: true });
  });
});

describe("intelligence slice", () => {
  it("caches profiles by id and clears that id's error", () => {
    let s = intelligence(init(intelligence), setProfileError({ id: 1, error: "x" }));
    expect(s.errors[1]).toBe("x");
    s = intelligence(s, setProfile({ id: 1, profile: profile() }));
    expect(s.profiles[1]?.name).toBe("Acme Corp");
    expect(s.errors[1]).toBeUndefined();
  });

  it("clears an error when given null and tracks the loading id", () => {
    let s = intelligence(init(intelligence), setProfileError({ id: 2, error: "x" }));
    s = intelligence(s, setProfileError({ id: 2, error: null }));
    expect(s.errors).toEqual({});
    expect(intelligence(s, setProfileLoading(2)).loadingId).toBe(2);
  });
});

describe("skills slice", () => {
  it("caches skills by company and clears errors", () => {
    let s = skills(init(skills), setSkillsError({ id: 3, error: "x" }));
    s = skills(s, setCompanySkills({ id: 3, data: { skills: [], topics: {} } }));
    expect(s.byCompany[3]).toEqual({ skills: [], topics: {} });
    expect(s.errors[3]).toBeUndefined();
  });
});
