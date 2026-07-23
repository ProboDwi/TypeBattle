import { apiError, apiSuccess } from "@/lib/api-response";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";

export async function POST(
  _: Request,
  context: RouteContext<"/api/races/[id]/leave">,
) {
  const { id } = await context.params;
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    const { data, error } = await auth.supabase.rpc("leave_race_room", {
      p_room_id: id,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess(data, "Kamu keluar dari room.");
  } catch {
    return apiError("Belum dapat keluar dari room.", 503);
  }
}
