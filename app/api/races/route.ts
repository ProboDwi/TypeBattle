import { apiError, apiErrorWithData, apiSuccess } from "@/lib/api-response";
import {
  normalizeActiveRaceRoom,
  type ActiveRaceRoom,
} from "@/lib/race/active-room";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";
import { roomSettingsSchema } from "@/lib/validation/race";

export async function POST(request: Request) {
  const parsed = roomSettingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Pengaturan room tidak valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Masuk untuk membuat room.", 401);

    const findActiveRoom = async (): Promise<ActiveRaceRoom | null> => {
      const { data, error } = await auth.supabase.rpc("get_active_race_room");
      return error ? null : normalizeActiveRaceRoom(data);
    };
    const existingRoom = await findActiveRoom();
    if (existingRoom)
      return apiErrorWithData(
        "Kamu masih terdaftar di room aktif lain.",
        { activeRoom: existingRoom },
        409,
      );

    if (
      !(await consumeRateLimit({
        identifier: auth.user.id,
        action: "room-create",
        limit: 5,
        windowSeconds: 600,
      }))
    )
      return apiError("Terlalu banyak room dibuat. Tunggu sebentar.", 429);
    const { data, error } = await auth.supabase.rpc("create_race_room", {
      p_name: parsed.data.name,
      p_visibility: "private",
      p_max_players: parsed.data.maxPlayers,
      p_difficulty: parsed.data.difficulty ?? null,
      p_category_id: parsed.data.categoryId ?? null,
    });
    if (error || !data) {
      const recoveredRoom = await findActiveRoom();
      if (recoveredRoom)
        return apiErrorWithData(
          "Room aktif ditemukan. Buka kembali room tersebut atau batalkan terlebih dahulu.",
          { activeRoom: recoveredRoom },
          409,
        );
      return apiError(friendlyRaceError(error?.message), 400);
    }
    return apiSuccess(
      { roomId: data.id, code: data.code },
      "Room berhasil dibuat.",
      201,
    );
  } catch {
    return apiError("Layanan room belum tersedia.", 503);
  }
}
