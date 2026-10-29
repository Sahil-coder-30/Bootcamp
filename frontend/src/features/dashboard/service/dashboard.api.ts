import { apiClient } from "@/services/apiClient";
import type { CompanyMatchItem } from "../components/TopCompanyMatchesCard";

export interface DashboardSummary {
  candidateId: string;
  tier1ReadinessPercent: number;
  totalCompaniesAvailable: number;
  topMatches: CompanyMatchItem[];
  verifiedAt: string;
}

export const getDashboardSummaryAPI = async (candidateId: string): Promise<DashboardSummary> => {
  try {
    // Attempt live ranking from backend talent check API
    const res = await apiClient.get<{ rows: Array<{ company_id: number; company_name: string; readiness_percent: number; company_tier: string }> }>(
      `/talent-check/ranking/${encodeURIComponent(candidateId)}`,
    );

    const rows = res.data?.rows || [];
    const topMatches: CompanyMatchItem[] = rows.slice(0, 4).map((r) => ({
      id: r.company_id,
      name: r.company_name,
      tier: (r.company_tier === "Super Dream" || r.company_tier === "Dream") ? r.company_tier : "Standard",
      packageLPA: r.company_tier === "Super Dream" ? "34 - 42 LPA" : "18 - 24 LPA",
      matchScore: r.readiness_percent,
      verdict: r.readiness_percent >= 80 ? "ready" : r.readiness_percent >= 60 ? "almost" : "gap",
    }));

    return {
      candidateId,
      tier1ReadinessPercent: rows.length > 0 ? Math.round(rows.reduce((acc, x) => acc + x.readiness_percent, 0) / rows.length) : 78,
      totalCompaniesAvailable: 115,
      topMatches: topMatches.length > 0 ? topMatches : getDefaultMatches(),
      verifiedAt: new Date().toISOString(),
    };
  } catch {
    // Deterministic fallback for preview
    return {
      candidateId,
      tier1ReadinessPercent: 78,
      totalCompaniesAvailable: 115,
      topMatches: getDefaultMatches(),
      verifiedAt: new Date().toISOString(),
    };
  }
};

function getDefaultMatches(): CompanyMatchItem[] {
  return [
    {
      id: 4,
      name: "Google LLC",
      tier: "Super Dream",
      packageLPA: "34 - 42 LPA",
      matchScore: 84,
      verdict: "ready",
    },
    {
      id: 78,
      name: "Microsoft",
      tier: "Super Dream",
      packageLPA: "44 - 51 LPA",
      matchScore: 78,
      verdict: "almost",
      gapCategory: "SysDesign (L3 vs L4)",
    },
    {
      id: 12,
      name: "Goldman Sachs",
      tier: "Super Dream",
      packageLPA: "28 - 32 LPA",
      matchScore: 81,
      verdict: "ready",
    },
    {
      id: 19,
      name: "Adobe Systems",
      tier: "Super Dream",
      packageLPA: "40 LPA",
      matchScore: 72,
      verdict: "almost",
      gapCategory: "Concurrency",
    },
  ];
}
