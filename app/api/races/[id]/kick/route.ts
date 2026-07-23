import { apiError, apiSuccess } from "@/lib/api-response";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";
import { kickSchema } from "@/lib/validation/race";

export async function POST(
  request: Request,
  context: RouteContext<"/api/races/[id]/kick">,
) {
  const { id } = await context.params;
  const parsed = kickSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Pemain tidak valid.", 422);
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    const { data, error } = await auth.supabase.rpc("kick_race_participant", {
      p_room_id: id,
      p_user_id: parsed.data.userId,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess({ kicked: data }, "Pemain dikeluarkan.");
  } catch {
    return apiError("Pemain belum dapat dikeluarkan.", 503);
  }
}
