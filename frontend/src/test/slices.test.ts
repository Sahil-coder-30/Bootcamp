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

import talentCheck, {
  initWhatIf,
  resetWhatIf,
  setCompanyBar,
  setCompanyRanking,
  setError,
  setLoading,
  setTalentCheckResult,
  setTalentMatrix,
  setWhatIfOverride,
} from "@/features/talentCheck/slice/talentCheck.slice";

describe("talentCheck slice", () => {
  it("manages company bars and clears error", () => {
    let s = talentCheck(init(talentCheck), setError({ scope: "bar", error: "fail" }));
    expect(s.errors.bar).toBe("fail");
    const bar = {
      company_id: 4,
      company_name: "Google",
      source: "db" as const,
      rows: [],
    };
    s = talentCheck(s, setCompanyBar({ id: 4, data: bar }));
    expect(s.barsByCompany[4]).toEqual(bar);
    expect(s.errors.bar).toBeNull();
  });

  it("stores talent check results and matrix", () => {
    let s = talentCheck(init(talentCheck), setError({ scope: "check", error: "fail" }));
    const result = {
      company: "Google",
      company_id: 4,
      profile_id: "6f1c-ananya",
      readiness_score: 82,
      verdict: "ready" as const,
      top_gaps: [],
      scoring_version: "tc-1.0",
      skillset_gap: [],
      explanation: "Meets bar",
      blocking_gaps: [],
    };
    s = talentCheck(s, setTalentCheckResult({ key: "6f1c-ananya:4", data: result }));
    expect(s.resultsByKey["6f1c-ananya:4"]).toEqual(result);
    expect(s.errors.check).toBeNull();

    const matrix = {
      companies: [{ company_id: 4, company_name: "Google" }],
      profiles: [{ id: "6f1c-ananya", name: "Ananya" }],
      cells: [],
      scoring_version: "tc-1.0",
    };
    s = talentCheck(s, setTalentMatrix(matrix));
    expect(s.matrix).toEqual(matrix);
    expect(s.errors.matrix).toBeNull();
  });

  it("manages rankings, what-if overrides, and loading states", () => {
    let s = talentCheck(init(talentCheck), setError({ scope: "rank", error: "fail" }));
    const ranking = [
      {
        company_id: 4,
        company_name: "Google",
        readiness_score: 80,
        verdict: "ready" as const,
      },
    ];
    s = talentCheck(s, setCompanyRanking({ profileId: "6f1c-ananya", data: ranking }));
    expect(s.rankingsByProfile["6f1c-ananya"]).toEqual(ranking);
    expect(s.errors.rank).toBeNull();

    s = talentCheck(s, initWhatIf("6f1c-ananya:4"));
    expect(s.whatIf.key).toBe("6f1c-ananya:4");
    expect(s.whatIf.overrides).toEqual({});

    s = talentCheck(s, setWhatIfOverride({ code: "DSA", level: 8 }));
    expect(s.whatIf.overrides).toEqual({ DSA: 8 });

    s = talentCheck(s, resetWhatIf());
    expect(s.whatIf.overrides).toEqual({});

    s = talentCheck(s, setLoading({ scope: "matrix", loading: true }));
    expect(s.loading.matrix).toBe(true);
  });
});
