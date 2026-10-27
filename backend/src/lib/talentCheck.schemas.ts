/**
 * talentCheck.schemas.ts
 * Zod validation schemas for Role 4: Talent Check backend endpoints.
 */

import { z } from "zod";

export const runTalentCheckSchema = z
  .object({
    profile_id: z.string().optional(),
    profileId: z.string().optional(),
    company_id: z.number().int().positive().optional(),
    companyId: z.number().int().positive().optional(),
    skill_levels_override: z.record(z.string(), z.number().int().min(1).max(10)).optional(),
    persist: z.boolean().optional().default(true),
  })
  .transform((data) => {
    const profile_id = data.profile_id ?? data.profileId;
    const company_id = data.company_id ?? data.companyId;
    if (!profile_id) {
      throw new Error("profile_id is required");
    }
    if (!company_id) {
      throw new Error("company_id is required");
    }
    return {
      profile_id,
      company_id,
      skill_levels_override: data.skill_levels_override,
      persist: data.persist,
    };
  });

export type RunTalentCheckInput = z.infer<typeof runTalentCheckSchema>;

export const matrixQuerySchema = z.object({
  company_ids: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [4, 78, 24];
      return val
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }),
});

export const rankQuerySchema = z.object({
  profile_id: z.string().min(1, "profile_id is required"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, Math.min(115, Number(val))) : 10)),
});
