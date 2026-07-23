import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug tidak valid."),
  description: z.string().trim().max(240).nullable().optional(),
});

export const typingTextSchema = z.object({
  title: z.string().trim().min(3).max(100),
  content: z
    .string()
    .trim()
    .min(120, "Teks minimal 120 karakter.")
    .max(450, "Teks maksimal 450 karakter."),
  categoryId: z.uuid(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["draft", "published", "archived"]),
  sourceLabel: z.string().trim().max(100).nullable().optional(),
});

export const userRoleSchema = z.object({ role: z.enum(["player", "admin"]) });
export const moderationSchema = z.object({
  type: z.enum(["practice", "race"]),
  valid: z.boolean(),
  note: z.string().trim().max(300).optional(),
});
