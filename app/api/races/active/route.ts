import { apiError, apiSuccess } from "@/lib/api-response";
import { normalizeActiveRaceRoom } from "@/lib/race/active-room";
import { getApiAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);

    const { data, error } = await auth.supabase.rpc("get_active_race_room");
    if (error) return apiError("Room aktif belum dapat diperiksa.", 503);

    return apiSuccess(
      { activeRoom: normalizeActiveRaceRoom(data) },
      "Status room aktif berhasil diperiksa.",
    );
  } catch {
    return apiError("Room aktif belum dapat diperiksa.", 503);
  }
}
