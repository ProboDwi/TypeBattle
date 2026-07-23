import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getApiAuth } from "@/lib/supabase/api-auth";

export async function POST() {
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Masuk untuk mencari lawan.", 401);
    if (
      !(await consumeRateLimit({
        identifier: auth.user.id,
        action: "matchmaking",
        limit: 10,
        windowSeconds: 300,
      }))
    )
      return apiError("Terlalu banyak permintaan matchmaking.", 429);
    const { data, error } = await auth.supabase.rpc("join_matchmaking");
    if (error) return apiError("Belum dapat masuk antrean.", 400);
    return apiSuccess(
      data,
      data?.status === "matched" ? "Lawan ditemukan." : "Mencari lawan…",
    );
  } catch {
    return apiError("Matchmaking belum tersedia.", 503);
  }
}
