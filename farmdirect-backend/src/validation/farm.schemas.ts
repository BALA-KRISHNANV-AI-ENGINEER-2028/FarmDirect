import { z } from "zod";
import { categorySchema, farmingMethodSchema } from "./enums";

export const createFarmSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: categorySchema.optional(),
  sizeAcres: z.number().positive().max(100000).optional(),
  farmingMethod: farmingMethodSchema.optional(),
  yearsActive: z.number().int().min(0).max(100).optional(),
  addressLine: z.string().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateFarmSchema = createFarmSchema.partial();
