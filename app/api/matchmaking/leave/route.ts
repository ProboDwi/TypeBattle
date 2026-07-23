import { apiError, apiSuccess } from "@/lib/api-response";
import { getApiAuth } from "@/lib/supabase/api-auth";

export async function POST() {
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    await auth.supabase.rpc("leave_matchmaking");
    return apiSuccess({}, "Pencarian dibatalkan.");
  } catch {
    return apiError("Pencarian belum dapat dibatalkan.", 503);
  }
}
