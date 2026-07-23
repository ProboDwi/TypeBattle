import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { finishPracticeSchema } from "@/lib/validation/practice";

export async function POST(
  request: Request,
  context: RouteContext<"/api/practice/[id]/finish">,
) {
  const { id } = await context.params;
  const parsed = finishPracticeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Data hasil latihan tidak valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user)
      return apiError("Masuk untuk menyimpan hasil resmi.", 401);
    if (
      !(await consumeRateLimit({
        identifier: authData.user.id,
        action: "practice-finish",
        limit: 12,
        windowSeconds: 60,
      }))
    )
      return apiError("Terlalu banyak permintaan hasil. Tunggu sebentar.", 429);
    const { data, error } = await supabase.rpc("finish_practice", {
      p_session_id: id,
      p_current_character: parsed.data.currentCharacter,
      p_incorrect_keystrokes: parsed.data.incorrectKeystrokes,
      p_total_keystrokes: parsed.data.totalKeystrokes,
      p_client_duration_ms: parsed.data.clientDurationMs,
      p_focus_losses: parsed.data.focusLosses,
      p_integrity_events: parsed.data.integrityEvents,
    });
    if (error) {
      console.error("[practice/finish] RPC ditolak", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      if (error.message.includes("protected profile fields"))
        return apiError(
          "Database belum menerima migration penyimpanan hasil terbaru.",
          503,
        );
      if (error.code === "42804")
        return apiError(
          "Database belum menerima migration perbaikan tipe status latihan.",
          503,
        );
      if (error.message.includes("session not found"))
        return apiError(
          "Sesi latihan tidak ditemukan atau bukan milikmu.",
          404,
        );
      if (error.message.includes("has not started"))
        return apiError("Sesi belum dapat diselesaikan.", 409);
      return apiError(
        "Hasil resmi belum tersimpan ke akun karena verifikasi database gagal.",
        400,
      );
    }
    return apiSuccess(data, "Hasil resmi tersimpan.");
  } catch {
    return apiError("Layanan hasil belum tersedia.", 503);
  }
}
