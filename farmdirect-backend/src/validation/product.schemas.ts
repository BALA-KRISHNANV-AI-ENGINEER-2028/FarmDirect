import { z } from "zod";
import { categorySchema, farmingMethodSchema } from "./enums";

export const createProductSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: categorySchema.optional(),
  description: z.string().max(5000).optional(),
  price: z.number().positive().max(1000000),
  unit: z.string().min(1).max(30),
  farmingMethod: farmingMethodSchema.optional(),
  harvestDate: z.string().date().optional(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  // Product image URLs — not part of the original Phase E schema (a real
  // gap surfaced during Phase H frontend integration, since the Add
  // Product form has nowhere to send photos without this). Replaces the
  // full image set on update rather than appending.
  images: z.array(z.string().url()).max(8).optional(),
});

// farmId is intentionally excluded from updates — moving a product between
// a farmer's own farms isn't a current frontend feature; keeping it out
// avoids a whole extra ownership-check path for a scenario nothing needs yet.
export const updateProductSchema = createProductSchema.omit({ farmId: true, stock: true }).partial();
