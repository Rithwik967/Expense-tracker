import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const profilePatchSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Enter your name.")
      .max(80, "Keep your name under 80 characters.")
      .optional(),
    phone: z
      .string()
      .trim()
      .max(20, "Keep the phone number under 20 characters.")
      .optional()
      .transform((value) => (value === undefined ? undefined : value === "" ? null : value)),
    mindsetNote: z
      .string()
      .max(280, "Keep that note under 280 characters.")
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }),
    startOfDay: z
      .string()
      .regex(timePattern, "Use 24-hour time, for example 06:00.")
      .optional(),
    notifyMorning: z.boolean().optional(),
    notifyEvening: z.boolean().optional(),
    notifyOverspend: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Nothing to update.",
  });

export type ProfilePatchInput = z.infer<typeof profilePatchSchema>;
