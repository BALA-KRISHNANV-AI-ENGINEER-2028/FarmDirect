import { z } from "zod";
import { movementReasonSchema } from "./enums";

export const adjustInventorySchema = z.object({
  change: z.number().int().refine((v) => v !== 0, "change must not be zero"),
  reason: movementReasonSchema,
  note: z.string().max(500).optional(),
});
