// The frontend copy of the profile rules runs the SAME shared fixture file as the backend suite
// (docs/contract/fixtures), plus the 4 seed profiles: completeness numbers and the JSON round trip.
import casesRaw from "../../../docs/contract/fixtures/candidate-profile-cases.json?raw";
import ananyaRaw from "../../../backend/src/data/seedProfiles/ananya-rao.json?raw";
import karthikRaw from "../../../backend/src/data/seedProfiles/karthik-subramaniam.json?raw";
import priyaRaw from "../../../backend/src/data/seedProfiles/priya-menon.json?raw";
import rohanRaw from "../../../backend/src/data/seedProfiles/rohan-verma.json?raw";
import { computeCompleteness } from "@/features/profile/lib/completeness";
import { fromFormValues, toFormValues } from "@/features/profile/lib/formMapping";
import {
  norm,
  profileFormSchema,
  profileImportSchema,
  type ProfileValues,
} from "@/features/profile/lib/schema";

interface Case {
  name: string;
  set: Record<string, unknown>;
  expect: "ok" | { path: string };
}
const fixtures = JSON.parse(casesRaw) as { base: Record<string, unknown>; cases: Case[] };

type Bag = Record<string, unknown>;
const getPath = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, k) => (acc as Bag | undefined)?.[k], obj);

function setPath(obj: Bag, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop() as string;
  const parent = keys.reduce<Bag>((acc, k) => acc[k] as Bag, obj);
  if (value && typeof value === "object" && "$delete" in value) delete parent[last];
  else if (value && typeof value === "object" && "$copy" in value) {
    parent[last] = structuredClone(getPath(obj, (value as { $copy: string }).$copy));
  } else parent[last] = value;
}

const build = (c: Case) => {
  const p = structuredClone(fixtures.base);
  for (const [path, value] of Object.entries(c.set)) setPath(p, path, value);
  return p;
};

describe("shared CandidateProfile fixture cases", () => {
  it.each(fixtures.cases)("$name", (c) => {
    const result = profileFormSchema.safeParse(build(c));
    if (c.expect === "ok") {
      expect(result.success, JSON.stringify(result.success ? [] : result.error.issues)).toBe(true);
      return;
    }
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain(c.expect.path);
  });

  it("lower-cases the email", () => {
    const parsed = profileFormSchema.parse({ ...fixtures.base, email: "ANANYA.RAO@Example.com" });
    expect(parsed.email).toBe("ananya.rao@example.com");
  });
});

describe("norm", () => {
  it("matches the backend: accents stripped, punctuation collapsed", () => {
    expect(norm("  Café—Déjà Vu!! ")).toBe("cafe deja vu");
    expect(norm("C++ / Rust")).toBe("c rust");
  });
});

const SEEDS = [ananyaRaw, karthikRaw, priyaRaw, rohanRaw].map(
  (r) => JSON.parse(r) as ProfileValues,
);

describe("seed profiles", () => {
  it.each(SEEDS.map((s) => [s.name, s] as const))("%s passes the form schema", (_n, seed) => {
    expect(profileFormSchema.safeParse(seed).success).toBe(true);
  });

  it("have the same completeness scores as the backend suite", () => {
    const scores = Object.fromEntries(SEEDS.map((s) => [s.name, computeCompleteness(s).score]));
    expect(scores).toEqual({
      "Ananya Rao": 90,
      "Karthik Subramaniam": 80,
      "Priya Menon": 60,
      "Rohan Verma": 90,
    });
  });

  it.each(SEEDS.map((s) => [s.name, s] as const))(
    "%s survives form values and back unchanged",
    (_n, seed) => {
      const { id: _i, version: _v, updated_at: _u, ...contract } = seed;
      expect(fromFormValues(toFormValues(seed))).toEqual(contract);
    },
  );

  it.each(SEEDS.map((s) => [s.name, s] as const))(
    "%s round-trips through exported JSON",
    (_n, seed) => {
      const exported = JSON.stringify(fromFormValues(seed), null, 2);
      const imported = profileImportSchema.parse(JSON.parse(exported));
      expect(fromFormValues(imported)).toEqual(fromFormValues(seed));
    },
  );
});

describe("profileImportSchema", () => {
  it("fills missing sections and drops server-owned fields", () => {
    const parsed = profileImportSchema.parse({
      name: "Ana Lyst",
      email: "ana@example.com",
      id: "3a000000-0000-4000-8000-000000000001",
      version: 4,
      skill_levels: fixtures.base["skill_levels"],
    });
    expect(parsed.skills).toEqual([]);
    expect(parsed.cv_file).toBeNull();
    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("version");
  });

  it("rejects non-objects", () => {
    expect(profileImportSchema.safeParse([]).success).toBe(false);
    expect(profileImportSchema.safeParse("nope").success).toBe(false);
  });
});
