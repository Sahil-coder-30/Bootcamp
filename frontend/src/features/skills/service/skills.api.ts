import { apiClient } from "@/services/apiClient";
import type { DashboardSkill } from "@/lib/companyData";

export interface SkillWithTopics extends DashboardSkill {
  topics?: string[];
}

export interface CompanySkillsData {
  skills: SkillWithTopics[];
  topics: Record<number, string[]>;
}

export const getCompanySkillsAPI = async (companyId: number): Promise<CompanySkillsData> => {
  const response = await apiClient.get<CompanySkillsData>(`/companies/${companyId}/skills`);
  return response.data;
};
