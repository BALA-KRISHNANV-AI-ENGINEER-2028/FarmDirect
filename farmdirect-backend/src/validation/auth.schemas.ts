import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: passwordSchema,
    role: z.enum(["customer", "farmer"]),
    fullName: z.string().min(1, "Full name is required").max(200),
    phone: z.string().min(6).max(20).optional(),
    farmName: z.string().min(1).max(200).optional(),
  })
  .refine((data) => data.role !== "farmer" || !!data.farmName, {
    message: "farmName is required when role is 'farmer'",
    path: ["farmName"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});
