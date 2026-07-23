import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/races/[id]/sync">,
) {
  const { id } = await context.params;
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    if (
      !(await consumeRateLimit({
        identifier: auth.user.id,
        action: "race-sync",
        limit: 30,
        windowSeconds: 60,
      }))
    ) {
      return apiError("Sinkronisasi terlalu sering.", 429);
    }

    const { data, error } = await auth.supabase.rpc("sync_race_state", {
      p_room_id: id,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess(data, "Status balapan tersinkron.");
  } catch {
    return apiError("Status balapan belum dapat disinkronkan.", 503);
  }
}
