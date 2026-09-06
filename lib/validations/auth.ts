import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Keep your name under 80 characters."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Keep the password under 72 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
