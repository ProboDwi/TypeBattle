import { apiError, apiSuccess } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return apiSuccess({ redirectTo: "/" }, "Sesi telah berakhir.");
  } catch {
    return apiError("Tidak dapat mengakhiri sesi.", 503);
  }
}
