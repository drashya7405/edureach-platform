import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Full name is required." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),
  email: z
    .string({ required_error: "Email address is required." })
    .trim()
    .email("Please provide a valid email address.")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required." })
    .min(6, "Password must be at least 6 characters.")
    .max(128, "Password cannot exceed 128 characters."),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s-]{7,20}$/, "Please provide a valid phone number format.")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email address is required." })
    .trim()
    .email("Please provide a valid email address.")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
