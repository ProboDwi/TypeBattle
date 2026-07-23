import { z } from "zod";
import { usernameSchema } from "@/lib/validation/auth";

export const settingsSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Nama tampilan wajib diisi.").max(50),
  bio: z.string().trim().max(280, "Bio maksimal 280 karakter."),
  avatarSeed: z.string().trim().min(1).max(64),
  soundEnabled: z.boolean(),
  reducedMotion: z.boolean(),
  gameTheme: z.enum(["system", "light", "dark"]),
});
