import { z } from "zod";

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

const nullableText = (max: number) => z.string().trim().max(max).nullable();

/** Everything a user can change on their own profile. */
export const profilePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: nullableText(20),
    college: nullableText(160),
    branch: nullableText(80),
    graduationYear: z.number().int().min(1990).max(2100).nullable(),
    // uuid string issued by the resume service (POST /resumes -> resume_id), or null to unlink
    resumeId: z.string().trim().min(1).max(64).nullable(),
    candidateProfileId: z.string().trim().min(1).max(64).nullable(),
  })
  .partial()
  .strict();
