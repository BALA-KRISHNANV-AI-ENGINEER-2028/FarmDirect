import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  avatarUrl: z.string().url().optional(),
  dateOfBirth: z.string().date().optional(),
  experienceYears: z.number().int().min(0).max(100).optional(),
  story: z.string().max(5000).optional(),
});
