import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  addressLine: z.string().min(1).max(300),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();
