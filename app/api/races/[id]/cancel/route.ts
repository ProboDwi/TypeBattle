import { apiError, apiSuccess } from "@/lib/api-response";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";

export async function POST(
  _: Request,
  context: RouteContext<"/api/races/[id]/cancel">,
) {
  const { id } = await context.params;
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    const { error } = await auth.supabase.rpc("cancel_race_room", {
      p_room_id: id,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess({}, "Room dibatalkan.");
  } catch {
    return apiError("Room belum dapat dibatalkan.", 503);
  }
}
