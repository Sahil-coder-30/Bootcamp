import { apiClient } from "@/services/apiClient";
import type { CompanyMatchItem } from "../components/TopCompanyMatchesCard";

export interface SkillGapItem {
  code: string;
  name: string;
  candidateLevel: number;
  requiredLevel: number;
  candidateBloom: "CU" | "AP" | "AS" | "EV" | "CR";
  requiredBloom: "CU" | "AP" | "AS" | "EV" | "CR";
  category: "Core" | "Systems" | "Engineering";
  gap: boolean;
  shortfall: number;
  blocking: boolean;
  nextTopics: Array<{ level: number; topics: string }>;
}

export interface RoadmapStepItem {
  id: string;
  categoryCode: string;
  categoryName: string;
  fromLevel: number;
  toLevel: number;
  hours: number;
  topics: string;
  completed: boolean;
}

export interface DashboardSummary {
  hasData?: boolean;
  candidateId: string;
  candidateName: string;
  email: string;
  education: string;
  preferredRoles: string[];
  completeness: number;
  tier1ReadinessPercent: number;
  readinessScore: number;
  readinessRange: { low: number; high: number };
  levelsCovered: number;
  levelsNeeded: number;
  categoriesMet: number;
  targetCompany: {
    id: number;
    name: string;
    verdict: string;
    explanation: string;
    blockingGaps: string[];
  };
  skills: SkillGapItem[];
  studyPlan: {
    totalHours: number;
    totalSteps: number;
    summary: string;
    steps: RoadmapStepItem[];
  };
  topMatches: CompanyMatchItem[];
  verifiedAt: string;
}

export const RADIX_CATEGORY_META: Record<
  string,
  { name: string; category: "Core" | "Systems" | "Engineering" }
> = {
  COD: { name: "Coding & Implementation", category: "Core" },
  DSA: { name: "Data Structures & Algorithms", category: "Core" },
  SQL: { name: "Database Systems & Storage", category: "Core" },
  OOD: { name: "Object-Oriented Design", category: "Core" },
  SYSD: { name: "System Design & Distributed", category: "Systems" },
  CLOUD: { name: "Cloud Architecture & DevOps", category: "Systems" },
  NETW: { name: "Computer Networks & Sockets", category: "Systems" },
  OS: { name: "Operating Systems & Concurrency", category: "Systems" },
  APTI: { name: "Quantitative Aptitude & Logic", category: "Engineering" },
  COMM: { name: "Technical Communication", category: "Engineering" },
  AI: { name: "Artificial Intelligence & ML", category: "Engineering" },
  SWE: { name: "Software Engineering & Testing", category: "Engineering" },
};

function normalizeBloom(code?: string): "CU" | "AP" | "AS" | "EV" | "CR" {
  switch (code?.toUpperCase()) {
    case "CR":
      return "CR";
    case "EV":
      return "EV";
    case "AS":
      return "AS";
    case "AP":
      return "AP";
    case "CU":
    default:
      return "CU";
  }
}

interface BackendProfile {
  id: string;
  name?: string;
  email?: string;
  education?: string;
  preferred_roles?: string[];
  completeness?: number;
  skill_levels?: Record<string, { level: number; source?: string }>;
}

interface BackendRankRow {
  company_id: number;
  company_name: string;
  readiness_score: number;
  verdict: "ready" | "almost" | "not_yet";
  top_gaps?: string[];
  blocking_count?: number;
}

interface BackendTalentCheckResult {
  company: string;
  company_id: number;
  readiness_score: number;
  verdict: "ready" | "almost" | "not_yet";
  top_gaps: string[];
  explanation: string;
  readiness_range?: { low: number; high: number };
  blocking_gaps: string[];
  levels_covered?: number;
  levels_needed?: number;
  categories_met?: number;
  skillset_gap: Array<{
    category_code: string;
    required_level: number;
    candidate_level: number;
    gap: boolean;
    shortfall: number;
    required_bloom: string;
    candidate_bloom: string;
    weight: number;
    next_topics?: Array<{ level: number; topics: string }>;
    blocking: boolean;
  }>;
  study_plan?: {
    steps: Array<{
      category_code: string;
      from_level: number;
      to_level: number;
      hours: number;
      topics?: string | null;
    }>;
    total_steps: number;
    total_hours: number;
    summary: string;
  };
}

export const getDashboardSummaryAPI = async (
  candidateId: string,
  targetCompanyId = 4,
  candidateFallback?: {
    name?: string | undefined;
    email?: string | undefined;
    role?: string | undefined;
  } | undefined,
): Promise<DashboardSummary> => {
  // 1. Fetch live Candidate Profile from /api/profiles/:id or by email
  let profile: BackendProfile | null = null;
  let resolvedId = candidateId;

  const isSeedAnanya = candidateId === "3a000000-0000-4000-8000-000000000001";
  const userEmail = candidateFallback?.email;

  // Try direct lookup by candidateId if it's not the seed Ananya, OR if the candidateFallback is explicitly Ananya
  if (candidateId && (!isSeedAnanya || !userEmail || userEmail === "ananya.rao@example.com")) {
    try {
      const profileRes = await apiClient.get<BackendProfile>(
        `/profiles/${encodeURIComponent(candidateId)}`,
      );
      if (profileRes.data && profileRes.data.id) {
        profile = profileRes.data;
        resolvedId = profile.id;
      }
    } catch {
      // not found by id
    }
  }

  // If not found by candidateId, try finding by candidateFallback.email
  if (!profile && userEmail) {
    try {
      const listRes = await apiClient.get<{ items: Array<{ id: string; email: string }> }>(
        "/profiles",
        { params: { email: userEmail, limit: 1 } },
      );
      const matched = listRes.data?.items?.[0];
      if (matched?.id) {
        resolvedId = matched.id;
        const profileRes = await apiClient.get<BackendProfile>(
          `/profiles/${encodeURIComponent(resolvedId)}`,
        );
        if (profileRes.data) {
          profile = profileRes.data;
        }
      }
    } catch {
      // not found by email
    }
  }

  // If candidate has no parsed resume or profile in the database:
  const hasProfile = Boolean(
    profile &&
    profile.id &&
    ((profile.skill_levels && Object.keys(profile.skill_levels).length > 0) ||
      ((profile as any).skills && (profile as any).skills.length > 0))
  );

  if (!hasProfile) {
    return {
      hasData: false,
      candidateId: resolvedId || candidateId,
      candidateName: candidateFallback?.name || profile?.name || "Candidate",
      email: candidateFallback?.email || profile?.email || "",
      education: candidateFallback?.role || profile?.education || "Campus Candidate",
      preferredRoles: profile?.preferred_roles || [],
      completeness: 0,
      tier1ReadinessPercent: 0,
      readinessScore: 0,
      readinessRange: { low: 0, high: 0 },
      levelsCovered: 0,
      levelsNeeded: 0,
      categoriesMet: 0,
      targetCompany: {
        id: targetCompanyId,
        name: "Google LLC",
        verdict: "not_uploaded",
        explanation: "Upload your resume to calculate your AST placement readiness.",
        blockingGaps: [],
      },
      skills: [],
      studyPlan: {
        totalHours: 0,
        totalSteps: 0,
        summary: "No study plan available. Upload your resume to generate a personalized roadmap.",
        steps: [],
      },
      topMatches: [],
      verifiedAt: new Date().toISOString(),
    };
  }

  // 2. Fetch live Corporate Hiring Bar Rankings from /api/talent-check/rank
  let rankRows: BackendRankRow[] = [];
  try {
    const rankRes = await apiClient.get<BackendRankRow[]>("/talent-check/rank", {
      params: { profile_id: resolvedId, limit: 5 },
    });
    rankRows = rankRes.data || [];
  } catch (err) {
    console.warn("[dashboard.api] Could not fetch rank matches:", err);
  }

  // 3. Fetch live Talent Check analysis against target recruiter (e.g. Google LLC, id: 4)
  let tc: BackendTalentCheckResult;
  try {
    const tcRes = await apiClient.post<BackendTalentCheckResult>("/talent-check", {
      profile_id: resolvedId,
      company_id: targetCompanyId,
    });
    tc = tcRes.data;
  } catch {
    // Deterministic fallback derived from candidate's real skill_levels
    const userLevels = (profile?.skill_levels || {}) as Record<string, any>;
    let covered = 0;
    const skillset_gap = Object.keys(RADIX_CATEGORY_META).map((code) => {
      const entry = userLevels[code];
      const lvl = typeof entry === "number" ? entry : (entry?.level || 0);
      covered += lvl;
      return {
        category_code: code,
        required_level: 6,
        candidate_level: lvl,
        gap: lvl < 6,
        shortfall: Math.max(0, 6 - lvl),
        required_bloom: "EV",
        candidate_bloom: lvl >= 7 ? "CR" : lvl >= 5 ? "EV" : lvl >= 3 ? "AP" : "CU",
        weight: 0.083,
        blocking: lvl < 4,
        next_topics: [{ level: lvl + 1, topics: `Advance ${RADIX_CATEGORY_META[code]?.name || code} proficiency` }],
      };
    });

    const calculatedScore = Math.min(100, Math.round((covered / 72) * 100));

    tc = {
      company: "Google LLC",
      company_id: targetCompanyId,
      readiness_score: calculatedScore,
      verdict: calculatedScore >= 75 ? "ready" : calculatedScore >= 50 ? "almost" : "not_yet",
      top_gaps: skillset_gap.filter((g) => g.gap).map((g) => g.category_code).slice(0, 4),
      explanation: `${profile?.name || "Candidate"} covers ${covered} skill levels across 12 categories.`,
      readiness_range: { low: Math.max(0, calculatedScore - 2), high: Math.min(100, calculatedScore + 2) },
      blocking_gaps: skillset_gap.filter((g) => g.blocking).map((g) => g.category_code),
      levels_covered: covered,
      levels_needed: 72,
      categories_met: skillset_gap.filter((g) => !g.gap).length,
      skillset_gap,
      study_plan: {
        total_steps: skillset_gap.filter((g) => g.gap).length,
        total_hours: skillset_gap.filter((g) => g.gap).reduce((acc, g) => acc + g.shortfall * 12, 0),
        summary: "Targeted skill enhancement roadmap based on current profile.",
        steps: skillset_gap.filter((g) => g.gap).map((g) => ({
          category_code: g.category_code,
          from_level: g.candidate_level,
          to_level: g.required_level,
          hours: g.shortfall * 12,
          topics: `Enhance proficiency in ${RADIX_CATEGORY_META[g.category_code]?.name || g.category_code}`,
        })),
      },
    };
  }

  // 4. Map skillset gap to SkillGapItem[]
  const skills: SkillGapItem[] = (tc.skillset_gap || []).map((gap) => {
    const meta = RADIX_CATEGORY_META[gap.category_code] || {
      name: gap.category_code,
      category: "Core" as const,
    };
    const cBloom = normalizeBloom(gap.candidate_bloom);
    const rBloom = normalizeBloom(gap.required_bloom);

    return {
      code: gap.category_code,
      name: meta.name,
      candidateLevel: gap.candidate_level,
      requiredLevel: gap.required_level,
      candidateBloom: cBloom,
      requiredBloom: rBloom,
      category: meta.category,
      gap: gap.gap,
      shortfall: gap.shortfall,
      blocking: gap.blocking,
      nextTopics: gap.next_topics || [],
    };
  });

  // 5. Map Study Plan steps
  const studySteps: RoadmapStepItem[] = (tc.study_plan?.steps || []).map((step, idx) => {
    const meta = RADIX_CATEGORY_META[step.category_code] || {
      name: step.category_code,
      category: "Core" as const,
    };
    return {
      id: `step-${idx + 1}-${step.category_code}`,
      categoryCode: step.category_code,
      categoryName: meta.name,
      fromLevel: step.from_level,
      toLevel: step.to_level,
      hours: step.hours,
      topics: step.topics || "Recommended skill enhancement topics",
      completed: false,
    };
  });

  // 6. Map live corporate matches from rankings
  const topMatches: CompanyMatchItem[] = rankRows.map((r) => ({
    id: r.company_id,
    name: r.company_name,
    tier: r.readiness_score >= 80 ? "Super Dream" : r.readiness_score >= 60 ? "Dream" : "Standard",
    packageLPA: r.readiness_score >= 80 ? "34 - 42 LPA" : "18 - 24 LPA",
    matchScore: r.readiness_score,
    verdict: r.verdict === "ready" ? "ready" : r.verdict === "almost" ? "almost" : "gap",
    gapCategory: r.top_gaps?.[0]
      ? RADIX_CATEGORY_META[r.top_gaps[0]]?.name || r.top_gaps[0]
      : undefined,
  }));

  const readinessScore = tc.readiness_score;

  return {
    hasData: true,
    candidateId: resolvedId || candidateId,
    candidateName: profile?.name || candidateFallback?.name || "Candidate",
    email: profile?.email || candidateFallback?.email || "",
    education: profile?.education || candidateFallback?.role || "Campus Candidate",
    preferredRoles: profile?.preferred_roles || ["Software Engineer"],
    completeness: profile?.completeness ?? Math.min(100, Math.round((skills.filter((s) => s.candidateLevel > 0).length / 12) * 100)),
    tier1ReadinessPercent: readinessScore,
    readinessScore,
    readinessRange: tc.readiness_range || { low: Math.max(0, readinessScore - 2), high: Math.min(100, readinessScore + 2) },
    levelsCovered: tc.levels_covered ?? 0,
    levelsNeeded: tc.levels_needed ?? 72,
    categoriesMet: tc.categories_met ?? 0,
    targetCompany: {
      id: tc.company_id,
      name: tc.company,
      verdict: tc.verdict,
      explanation: tc.explanation,
      blockingGaps: tc.blocking_gaps || [],
    },
    skills,
    studyPlan: {
      totalHours: tc.study_plan?.total_hours || 0,
      totalSteps: tc.study_plan?.total_steps || 0,
      summary: tc.study_plan?.summary || "",
      steps: studySteps,
    },
    topMatches: topMatches,
    verifiedAt: new Date().toISOString(),
  };
};

function getDefaultMatches(): CompanyMatchItem[] {
  return [
    {
      id: 1,
      name: "Accenture plc",
      tier: "Standard",
      packageLPA: "12 - 16 LPA",
      matchScore: 97,
      verdict: "ready",
    },
    {
      id: 22,
      name: "Tata Consultancy Services",
      tier: "Standard",
      packageLPA: "12 - 16 LPA",
      matchScore: 97,
      verdict: "ready",
    },
    {
      id: 4,
      name: "Google LLC",
      tier: "Super Dream",
      packageLPA: "34 - 42 LPA",
      matchScore: 62,
      verdict: "almost",
      gapCategory: "Cloud & DevOps",
    },
    {
      id: 8,
      name: "Cognizant Technology Solutions",
      tier: "Standard",
      packageLPA: "12 - 14 LPA",
      matchScore: 95,
      verdict: "ready",
    },
  ];
}
