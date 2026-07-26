import { randomUUID } from "node:crypto";
import { apiError, apiSuccess } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApiAuth } from "@/lib/supabase/api-auth";

async function ensureRaceBot() {
  const admin = createAdminClient();
  const findBot = async () =>
    admin
      .from("profiles")
      .select("id")
      .eq("is_bot", true)
      .limit(1)
      .maybeSingle();

  const existing = await findBot();
  if (existing.data?.id) return String(existing.data.id);

  const created = await admin.auth.admin.createUser({
    email: "race-bot@probodwi.my.id",
    password: `Bot-${randomUUID()}`,
    email_confirm: true,
    user_metadata: {
      username: "keylane_bot",
      display_name: "KeyBot",
    },
  });

  let botId = created.data.user?.id;
  if (!botId) {
    const [recovered, users] = await Promise.all([
      findBot(),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    botId =
      recovered.data?.id ??
      users.data.users.find(
        (user) => user.email === "race-bot@probodwi.my.id",
      )?.id;
  }
  if (!botId) throw new Error("Bot system account is unavailable");

  const { error } = await admin
    .from("profiles")
    .update({
      is_bot: true,
      display_name: "KeyBot",
      avatar_seed: "keylane-race-bot",
      rating: 1000,
    })
    .eq("id", botId);
  if (error) throw error;
  return String(botId);
}

export async function POST() {
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);

    const botId = await ensureRaceBot();
    const { data, error } = await auth.supabase.rpc("matchmake_with_bot", {
      p_bot_user_id: botId,
    });
    if (error) {
      if (error.message.includes("wait period"))
        return apiError("Masih mencari pemain manusia.", 409);
      return apiError("Bot belum dapat masuk ke pertandingan.", 400);
    }
    return apiSuccess(
      data,
      data?.opponent === "human"
        ? "Pemain ditemukan."
        : "Tidak ada pemain lain. KeyBot menjadi lawanmu.",
    );
  } catch (error) {
    console.error("[matchmaking/bot] Gagal menyiapkan KeyBot", error);
    return apiError("Lawan bot belum tersedia.", 503);
  }
}
