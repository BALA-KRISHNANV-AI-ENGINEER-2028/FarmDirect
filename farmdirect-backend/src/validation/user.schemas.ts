import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional(),
  avatarUrl: z.string().max(2000).optional().or(z.literal("")),
  dateOfBirth: z.string().max(100).optional().or(z.literal("")),
  experienceYears: z.number().int().min(0).max(100).optional(),
  story: z.string().max(5000).optional(),
});
