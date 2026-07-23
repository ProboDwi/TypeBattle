import { z } from "zod";

export const roomSettingsSchema = z.object({
  name: z.string().trim().min(3, "Nama room minimal 3 karakter.").max(60),
  maxPlayers: z.int().min(2).max(8),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
});

export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NP-Z2-9]{6}$/, "Kode room harus enam karakter yang valid."),
});

export const readySchema = z.object({ ready: z.boolean() });
export const roomIdSchema = z.object({ roomId: z.uuid() });
export const kickSchema = z.object({ userId: z.uuid() });
export const progressSchema = z.object({
  currentCharacter: z.int().min(0).max(1000),
  incorrectKeystrokes: z.int().min(0).max(20_000),
  totalKeystrokes: z.int().min(0).max(20_000),
  sequence: z.int().positive().max(1_000_000),
});
export const finishRaceSchema = z.object({
  nonce: z.uuid(),
  currentCharacter: z.int().min(0).max(1000),
  incorrectKeystrokes: z.int().min(0).max(20_000),
  totalKeystrokes: z.int().min(0).max(20_000),
  clientDurationMs: z.int().positive().max(3_600_000),
  focusLosses: z.int().min(0).max(10_000).default(0),
  integrityEvents: z.array(z.string().max(40)).max(30).default([]),
});
