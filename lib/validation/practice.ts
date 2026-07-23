import { z } from "zod";

export const startPracticeSchema = z.object({
  mode: z.enum(["quote", "timed_30", "timed_60", "daily"]),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  excludeTextId: z.string().trim().min(1).max(100).nullable().optional(),
});

export const finishPracticeSchema = z.object({
  currentCharacter: z.int().min(0).max(1000),
  incorrectKeystrokes: z.int().min(0).max(20_000),
  totalKeystrokes: z.int().min(0).max(20_000),
  clientDurationMs: z.int().positive().max(3_600_000),
  focusLosses: z.int().min(0).max(10_000).default(0),
  integrityEvents: z.array(z.string().max(40)).max(30).default([]),
});
