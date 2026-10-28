import reducer, {
  appendList,
  clearConflict,
  clearPrefill,
  removeProfile,
  removeProvenanceItem,
  setConflict,
  setList,
  setListError,
  setListLoading,
  setPrefill,
  setProfile,
  setProfileError,
  setReview,
  setReviewMany,
  setSaving,
  type ProfileState,
} from "@/features/profile/slice/profile.slice";
import type { ProfileSummary, StoredProfile } from "@/features/profile/lib/types";
import { blankValues } from "@/features/profile/lib/formMapping";

const initial = (): ProfileState => reducer(undefined, { type: "@@init" });
const stored = (id = "p1", version = 1): StoredProfile => ({
  ...blankValues(),
  id,
  version,
  updated_at: "now",
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

describe("profile slice", () => {
  it("starts empty", () => {
    const s = initial();
    expect(s.byId).toEqual({});
    expect(s.list).toMatchObject({ items: [], loaded: false, loading: false, nextCursor: null });
    expect(s.current).toMatchObject({ id: null, saving: false, conflict: null });
    expect(s.prefill.diff).toBeNull();
  });

  it("caches a profile and tracks the current id", () => {
    const s = reducer(initial(), setProfile({ profile: stored("p1", 3), version: 3 }));
    expect(s.byId["p1"]?.version).toBe(3);
    expect(s.current.id).toBe("p1");
  });

  it("setProfileError stops loading", () => {
    const s = reducer(
      { ...initial(), current: { ...initial().current, loading: true } },
      setProfileError("boom"),
    );
    expect(s.current).toMatchObject({ error: "boom", loading: false });
  });

  it("setList marks the list loaded; appendList skips duplicates", () => {
    let s = reducer(
      initial(),
      setList({ items: [summary("a"), summary("b")], nextCursor: "c1", query: "q" }),
    );
    expect(s.list).toMatchObject({ loaded: true, query: "q", nextCursor: "c1" });
    s = reducer(s, appendList({ items: [summary("b"), summary("c")], nextCursor: null }));
    expect(s.list.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(s.list.nextCursor).toBeNull();
  });

  it("list errors stop loading", () => {
    let s = reducer(initial(), setListLoading(true));
    s = reducer(s, setListError("offline"));
    expect(s.list).toMatchObject({ loading: false, error: "offline" });
  });

  it("removeProfile drops it from the cache and the list", () => {
    let s = reducer(initial(), setProfile({ profile: stored("p1"), version: 1 }));
    s = reducer(s, setList({ items: [summary("p1"), summary("p2")], nextCursor: null, query: "" }));
    s = reducer(s, removeProfile("p1"));
    expect(s.byId).toEqual({});
    expect(s.list.items.map((i) => i.id)).toEqual(["p2"]);
  });

  it("saving and conflict state", () => {
    let s = reducer(initial(), setSaving(true));
    expect(s.current.saving).toBe(true);
    s = reducer(s, setConflict({ server: stored("p1", 4), version: 4 }));
    expect(s.current.conflict?.version).toBe(4);
    s = reducer(s, clearConflict());
    expect(s.current.conflict).toBeNull();
  });

  it("prefill and review state", () => {
    let s = reducer(initial(), setPrefill({ extractionId: "e1", warnings: ["w"] }));
    expect(s.prefill).toMatchObject({ extractionId: "e1", warnings: ["w"] });
    s = reducer(s, setReview({ path: "name", state: "accepted" }));
    s = reducer(s, setReviewMany({ email: "rejected", phone: "edited" }));
    expect(s.prefill.review).toEqual({ name: "accepted", email: "rejected", phone: "edited" });
    s = reducer(s, clearPrefill());
    expect(s.prefill).toMatchObject({ extractionId: null, review: {}, provenance: {}, diff: null });
  });

  it("removeProvenanceItem drops the item and shifts later ones down, in every map", () => {
    const prov = (c: "high" | "medium") => ({
      source: "resume" as const,
      extraction_id: "e",
      confidence: c,
      evidence: "x",
    });
    const s0 = reducer(
      initial(),
      setPrefill({
        provenance: {
          name: prov("high"),
          "skills.0.skill_name": prov("high"),
          "skills.1.skill_name": prov("medium"),
          "skills.2.skill_name": prov("high"),
          "internships.1.org": prov("medium"),
        },
        review: { "skills.1.skill_name": "accepted", "skills.2.skill_name": "rejected" },
        previous: { "skills.1.skill_name": "", "skills.2.skill_name": "old" },
      }),
    );
    const s = reducer(s0, removeProvenanceItem({ list: "skills", index: 1 }));
    expect(Object.keys(s.prefill.provenance).sort()).toEqual([
      "internships.1.org",
      "name",
      "skills.0.skill_name",
      "skills.1.skill_name",
    ]);
    expect(s.prefill.provenance["skills.1.skill_name"]?.confidence).toBe("high");
    expect(s.prefill.review).toEqual({ "skills.1.skill_name": "rejected" });
    expect(s.prefill.previous).toEqual({ "skills.1.skill_name": "old" });
  });
});
