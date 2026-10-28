// Completeness meter. Same weights as backend/src/lib/profileCompleteness.ts; both are asserted
// against the 4 seed profiles so a candidate sees the same number before and after saving.
import type { ProfileValues } from "./schema";

export type Step =
  "start" | "basics" | "education" | "experience" | "achievements" | "skills" | "levels";

export interface Hint {
  step: Step;
  text: string;
  points: number;
}

export function computeCompleteness(p: ProfileValues): { score: number; hints: Hint[] } {
  let score = 0;
  const hints: Hint[] = [];
  const award = (ok: boolean, points: number, hint: Omit<Hint, "points">) => {
    if (ok) score += points;
    else hints.push({ ...hint, points });
  };

  award(Boolean(p.name?.trim()) && Boolean(p.email?.trim()), 10, {
    step: "basics",
    text: "Add your name and email",
  });
  award(
    p.education_details.some((e) => Boolean(e.year?.trim())),
    10,
    { step: "education", text: "Add your degree and graduation year" },
  );
  const strong = p.skills.filter((s) => s.confidence === "high").length;
  award(p.skills.length >= 5 && strong >= 3, 20, {
    step: "skills",
    text: `Add evidence to ${Math.max(1, 3 - strong)} skills: where did you use them?`,
  });
  award(p.internships.length >= 1 || p.projects.length >= 2, 20, {
    step: "experience",
    text: "Add an internship or a project",
  });
  award(p.hackathons.length + p.certifications.length >= 1, 10, {
    step: "achievements",
    text: "Hackathons and certifications set you apart",
  });
  award(p.preferred_roles.length >= 1, 10, {
    step: "basics",
    text: "Pick target roles so we can match JDs",
  });
  award(Boolean(p.cv_file), 10, { step: "start", text: "Upload your CV" });
  const untouchedLow = Object.values(p.skill_levels).filter(
    (l) => l.confidence === "low" && l.source === "resume_inferred",
  ).length;
  award(untouchedLow === 0, 10, {
    step: "levels",
    text: `Review ${untouchedLow} skill levels that have no evidence`,
  });

  return { score, hints: hints.sort((a, b) => b.points - a.points) };
}
