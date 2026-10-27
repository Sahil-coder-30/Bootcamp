import { apiClient } from "@/services/apiClient";
import type { CompanySummary } from "@/lib/companyData";

export const getCompaniesAPI = async (): Promise<CompanySummary[]> => {
  const response = await apiClient.get<CompanySummary[]>("/companies");
  return response.data;
};
