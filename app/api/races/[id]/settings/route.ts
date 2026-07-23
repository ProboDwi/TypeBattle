import { apiError, apiSuccess } from "@/lib/api-response";
import { friendlyRaceError, getApiAuth } from "@/lib/supabase/api-auth";
import { roomSettingsSchema } from "@/lib/validation/race";

export async function PUT(
  request: Request,
  context: RouteContext<"/api/races/[id]/settings">,
) {
  const { id } = await context.params;
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
    if (!auth) return apiError("Sesi telah berakhir.", 401);
    const { data: currentRoom, error: roomError } = await auth.supabase
      .from("race_rooms")
      .select("visibility")
      .eq("id", id)
      .single();
    if (roomError || !currentRoom)
      return apiError("Room tidak ditemukan atau tidak dapat diakses.", 404);

    const { data, error } = await auth.supabase.rpc(
      "update_race_room_settings",
      {
        p_room_id: id,
        p_name: parsed.data.name,
        p_visibility: currentRoom.visibility,
        p_max_players: parsed.data.maxPlayers,
        p_difficulty: parsed.data.difficulty ?? null,
        p_category_id: parsed.data.categoryId ?? null,
      },
    );
    if (error) return apiError(friendlyRaceError(error.message), 400);
    return apiSuccess(data, "Pengaturan room disimpan.");
  } catch {
    return apiError("Pengaturan belum dapat disimpan.", 503);
  }
}
