import { randomUUID } from "node:crypto";
import { apiError, apiSuccess } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApiAuth } from "@/lib/supabase/api-auth";

const BOT_ACCOUNTS = [
  {
    email: "race-bot@probodwi.my.id",
    username: "keylane_bot_alpha",
    displayName: "KeyBot Alpha",
    avatarSeed: "keylane-race-bot-alpha",
  },
  {
    email: "race-bot-2@probodwi.my.id",
    username: "keylane_bot_beta",
    displayName: "KeyBot Beta",
    avatarSeed: "keylane-race-bot-beta",
  },
] as const;

async function ensureRaceBots() {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id")
    .eq("is_bot", true)
    .order("created_at")
    .limit(BOT_ACCOUNTS.length);
  if (existingError) throw existingError;

  const botIds = (existing ?? []).map((profile) => String(profile.id));
  for (let index = botIds.length; index < BOT_ACCOUNTS.length; index += 1) {
    const definition = BOT_ACCOUNTS[index];
    const created = await admin.auth.admin.createUser({
      email: definition.email,
      password: `Bot-${randomUUID()}`,
      email_confirm: true,
      user_metadata: {
        username: definition.username,
        display_name: definition.displayName,
      },
    });

    let botId = created.data.user?.id;
    if (!botId) {
      const users = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      botId = users.data.users.find(
        (user) => user.email === definition.email,
      )?.id;
    }
    if (!botId) throw new Error(`System bot ${index + 1} is unavailable`);
    botIds.push(String(botId));
  }

  await Promise.all(
    botIds.map(async (botId, index) => {
      const definition = BOT_ACCOUNTS[index];
      const { error } = await admin
        .from("profiles")
        .update({
          is_bot: true,
          display_name: definition.displayName,
          avatar_seed: definition.avatarSeed,
          rating: 1000,
        })
        .eq("id", botId);
      if (error) throw error;
    }),
  );
  return botIds;
}

export async function POST() {
  try {
    const auth = await getApiAuth();
    if (!auth) return apiError("Sesi telah berakhir.", 401);

    const botIds = await ensureRaceBots();
    const { data, error } = await auth.supabase.rpc("matchmake_with_bots", {
      p_bot_user_ids: botIds,
    });
    if (error) {
      if (error.message.includes("wait period"))
        return apiError("Masih mencari pemain manusia.", 409);
      return apiError("Bot belum dapat masuk ke pertandingan.", 400);
    }
    const message =
      data?.opponent === "humans"
        ? "Dua pemain manusia ditemukan."
        : data?.opponent === "mixed"
          ? "Satu pemain manusia ditemukan. KeyBot mengisi slot terakhir."
          : "Tidak ada pemain lain. Dua KeyBot menjadi lawanmu.";
    return apiSuccess(data, message);
  } catch (error) {
    console.error("[matchmaking/bot] Gagal menyiapkan KeyBot", error);
    return apiError("Lawan bot belum tersedia.", 503);
  }
}
