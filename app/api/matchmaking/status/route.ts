import { apiError, apiSuccess } from "@/lib/api-response";
import { getApiAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    const { data } = await auth.supabase
      .from("matchmaking_queue")
      .select("status,queued_at,matched_room_id,race_rooms(code)")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!data) return apiSuccess({ status: "idle" });
    const room = data.race_rooms as { code?: string } | null;
    return apiSuccess({
      status: data.status,
      queuedAt: data.queued_at,
      code: room?.code ?? null,
    });
  } catch {
    return apiError("Status matchmaking belum tersedia.", 503);
  }
}
