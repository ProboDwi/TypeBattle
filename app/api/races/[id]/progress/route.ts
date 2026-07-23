import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";
import { progressSchema } from "@/lib/validation/race";

export async function POST(
  request: Request,
  context: RouteContext<"/api/races/[id]/progress">,
) {
  const { id } = await context.params;
  const parsed = progressSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError("Snapshot progres tidak valid.", 422);
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    if (
      !(await consumeRateLimit({
        identifier: auth.user.id,
        action: "race-progress",
        limit: 90,
        windowSeconds: 60,
      }))
    )
      return apiError("Snapshot terlalu sering.", 429);
    const { data, error } = await auth.supabase.rpc("race_progress_snapshot", {
      p_room_id: id,
      p_current_character: parsed.data.currentCharacter,
      p_incorrect_keystrokes: parsed.data.incorrectKeystrokes,
      p_total_keystrokes: parsed.data.totalKeystrokes,
      p_sequence: parsed.data.sequence,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    if (!data) {
      return apiError(
        "Snapshot ditolak karena urutan atau lonjakan progres tidak wajar.",
        409,
      );
    }
    return apiSuccess({}, "Progres tersinkron.");
  } catch {
    return apiError("Progres belum dapat disinkronkan.", 503);
  }
}
