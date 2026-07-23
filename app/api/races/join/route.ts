import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";
import { joinRoomSchema } from "@/lib/validation/race";

export async function POST(request: Request) {
  const parsed = joinRoomSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Kode room tidak valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Masuk untuk bergabung ke room.", 401);
    if (
      !(await consumeRateLimit({
        identifier: auth.user.id,
        action: "room-join",
        limit: 10,
        windowSeconds: 300,
      }))
    )
      return apiError("Terlalu banyak percobaan bergabung.", 429);
    const { data, error } = await auth.supabase.rpc("join_race_room", {
      p_code: parsed.data.code,
    });
    if (error || !data)
      return apiError(
        friendlyRaceError(error?.message),
        error?.message.includes("not found") ? 404 : 400,
      );
    return apiSuccess(
      { roomId: data.id, code: data.code },
      "Berhasil bergabung.",
    );
  } catch {
    return apiError("Layanan room belum tersedia.", 503);
  }
}
