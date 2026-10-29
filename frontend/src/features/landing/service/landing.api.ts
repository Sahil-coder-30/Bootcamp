import { apiClient } from "@/services/apiClient";

export interface PlatformStats {
  recruiterCount: number;
  maxCtcLpa: number;
  bloomTopicsCount: number;
  verifiedYear: string;
}

export const getLandingDataAPI = async (): Promise<PlatformStats> => {
  try {
    const res = await apiClient.get<Array<{ id: number }>>("/companies");
    const count = Array.isArray(res.data) ? res.data.length : 115;
    return {
      recruiterCount: count,
      maxCtcLpa: 55,
      bloomTopicsCount: 1380,
      verifiedYear: "2025–26",
    };
  } catch {
    return {
      recruiterCount: 115,
      maxCtcLpa: 55,
      bloomTopicsCount: 1380,
      verifiedYear: "2025–26",
    };
  }
};
