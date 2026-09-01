import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Full name is required." })
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
  email: z
    .string({ required_error: "Email address is required." })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address.")
    .max(255, "Email is too long."),
  password: z
    .string({ required_error: "Password is required." })
    .min(6, "Password must be at least 6 characters.")
    .max(128, "Password must not exceed 128 characters."),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password cannot be empty.")
    .max(128, "Password is too long."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
