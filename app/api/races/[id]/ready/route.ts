import { apiError, apiSuccess } from "@/lib/api-response";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";
import { readySchema } from "@/lib/validation/race";

export async function POST(
  request: Request,
  context: RouteContext<"/api/races/[id]/ready">,
) {
  const { id } = await context.params;
  const parsed = readySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Status siap tidak valid.", 422);
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    const { data, error } = await auth.supabase.rpc("set_race_ready", {
      p_room_id: id,
      p_ready: parsed.data.ready,
    });
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess(
      data,
      parsed.data.ready ? "Kamu siap." : "Status siap dibatalkan.",
    );
  } catch {
    return apiError("Status siap belum dapat disimpan.", 503);
  }
}
