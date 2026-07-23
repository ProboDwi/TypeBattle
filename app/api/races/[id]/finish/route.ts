import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";
import { finishRaceSchema } from "@/lib/validation/race";

export async function POST(
  request: Request,
  context: RouteContext<"/api/races/[id]/finish">,
) {
  const { id } = await context.params;
  const parsed = finishRaceSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Data finis tidak valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    if (
      !(await consumeRateLimit({
        identifier: auth.user.id,
        action: "race-finish",
        limit: 6,
        windowSeconds: 60,
      }))
    )
      return apiError("Permintaan finis terlalu sering.", 429);
    const { data, error } = await auth.supabase.rpc("finish_race", {
      p_room_id: id,
      p_nonce: parsed.data.nonce,
      p_current_character: parsed.data.currentCharacter,
      p_incorrect_keystrokes: parsed.data.incorrectKeystrokes,
      p_total_keystrokes: parsed.data.totalKeystrokes,
      p_client_duration_ms: parsed.data.clientDurationMs,
      p_focus_losses: parsed.data.focusLosses,
      p_integrity_events: parsed.data.integrityEvents,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess(data, "Hasil balapan tersimpan.");
  } catch {
    return apiError("Hasil balapan belum dapat disimpan.", 503);
  }
}
