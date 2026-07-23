import { apiError, apiSuccess } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authorization !== `Bearer ${process.env.CRON_SECRET}`
  )
    return apiError("Tidak diizinkan.", 401);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("cleanup_stale_game_state");
    if (error) return apiError("Cleanup gagal.", 500);
    return apiSuccess(data, "Cleanup selesai.");
  } catch {
    return apiError("Cleanup belum tersedia.", 503);
  }
}
