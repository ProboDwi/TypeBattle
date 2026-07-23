import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";

export async function POST(
  _: Request,
  context: RouteContext<"/api/races/[id]/start">,
) {
  const { id } = await context.params;
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    if (
      !(await consumeRateLimit({
        identifier: auth.user.id,
        action: "race-start",
        limit: 4,
        windowSeconds: 60,
      }))
    )
      return apiError("Tunggu sebelum mencoba mulai lagi.", 429);
    const { data, error } = await auth.supabase.rpc("start_race", {
      p_room_id: id,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess(data, "Countdown dimulai.");
  } catch {
    return apiError("Balapan belum dapat dimulai.", 503);
  }
}
