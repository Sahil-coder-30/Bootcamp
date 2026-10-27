import { apiClient } from "@/services/apiClient";
import type { CompanyProfile } from "@/lib/companyData";

export const getCompanyProfileAPI = async (companyId: number): Promise<CompanyProfile | null> => {
  const response = await apiClient.get<CompanyProfile | null>(`/companies/${companyId}`);
  return response.data;
};
