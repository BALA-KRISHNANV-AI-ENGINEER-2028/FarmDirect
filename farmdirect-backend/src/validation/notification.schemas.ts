import { z } from "zod";

export const updatePreferencesSchema = z.object({
  orderUpdates: z.boolean().optional(),
  priceDrops: z.boolean().optional(),
  newHarvests: z.boolean().optional(),
  promotions: z.boolean().optional(),
  newOrderAlerts: z.boolean().optional(),
  lowStockAlerts: z.boolean().optional(),
  aiInsightUpdates: z.boolean().optional(),
  customerReviews: z.boolean().optional(),
});
