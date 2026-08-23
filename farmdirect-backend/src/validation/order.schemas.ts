import { z } from "zod";
import { orderStatusSchema } from "./enums";

const inlineAddressSchema = z.object({
  fullName: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  addressLine: z.string().min(1).max(300),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

export const createOrderSchema = z
  .object({
    addressId: z.string().uuid().optional(),
    address: inlineAddressSchema.optional(),
    deliveryMethod: z.enum(["standard", "express"]),
    paymentMethod: z.enum(["upi", "card", "cod"]),
  })
  .refine((data) => !!data.addressId || !!data.address, {
    message: "Either addressId or an inline address is required",
    path: ["addressId"],
  });

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  note: z.string().max(500).optional(),
});
