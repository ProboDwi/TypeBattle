import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation/profile";

export async function PUT(request: Request) {
  const parsed = settingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Periksa kembali pengaturan.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user)
      return apiError("Sesi telah berakhir. Silakan masuk lagi.", 401);
    if (
      !(await consumeRateLimit({
        identifier: authData.user.id,
        action: "settings",
        limit: 10,
        windowSeconds: 600,
      }))
    )
      return apiError("Terlalu banyak perubahan. Tunggu sebentar.", 429);
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.data.username)
      .neq("id", authData.user.id)
      .maybeSingle();
    if (existing)
      return apiError("Username sudah digunakan.", 409, {
        username: ["Pilih username lain."],
      });
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username: parsed.data.username,
        display_name: parsed.data.displayName,
        bio: parsed.data.bio || null,
        avatar_seed: parsed.data.avatarSeed,
      })
      .eq("id", authData.user.id);
    if (profileError) return apiError("Profil belum dapat disimpan.", 400);
    const { error: preferenceError } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: authData.user.id,
        sound_enabled: parsed.data.soundEnabled,
        reduced_motion: parsed.data.reducedMotion,
        game_theme: parsed.data.gameTheme,
      });
    if (preferenceError)
      return apiError("Preferensi belum dapat disimpan.", 400);
    return apiSuccess(
      { username: parsed.data.username },
      "Pengaturan disimpan.",
    );
  } catch {
    return apiError("Layanan pengaturan belum tersedia.", 503);
  }
}
