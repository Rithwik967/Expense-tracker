import { z } from "zod";

import { uuidSchema } from "./shared";

/** Category validation. Mirrors the schema's uniqueness and emptiness rules. */

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the category a name.")
    .max(48, "Keep category names under 48 characters."),
  icon: z.string().trim().max(48).nullable().default(null),
  description: z.string().trim().max(140).nullable().default(null),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type CategoryInput = z.output<typeof categoryInputSchema>;

export const categoryPatchSchema = categoryInputSchema.partial();
export type CategoryPatch = z.output<typeof categoryPatchSchema>;

export const categoryReorderSchema = z.object({
  orderedIds: z.array(uuidSchema).min(1, "Nothing to reorder."),
});

export const categoryFormSchema = z.object({
  name: z.string().min(1, "Give the category a name."),
  icon: z.string(),
  description: z.string().max(140, "Keep it under 140 characters."),
});
export type CategoryFormValues = z.input<typeof categoryFormSchema>;
