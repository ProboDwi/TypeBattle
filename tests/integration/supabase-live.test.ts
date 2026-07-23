import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hostEmail = process.env.E2E_PLAYER_EMAIL;
const hostPassword = process.env.E2E_PLAYER_PASSWORD;
const guestEmail = process.env.E2E_PLAYER_TWO_EMAIL;
const guestPassword = process.env.E2E_PLAYER_TWO_PASSWORD;
const configured = Boolean(
  url && key && hostEmail && hostPassword && guestEmail && guestPassword,
);

describe.skipIf(!configured)("live Supabase lifecycle and RLS", () => {
  let host: SupabaseClient;
  let guest: SupabaseClient;
  let hostId = "";
  let guestId = "";

  beforeAll(async () => {
    host = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    guest = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [hostAuth, guestAuth] = await Promise.all([
      host.auth.signInWithPassword({
        email: hostEmail!,
        password: hostPassword!,
      }),
      guest.auth.signInWithPassword({
        email: guestEmail!,
        password: guestPassword!,
      }),
    ]);
    expect(hostAuth.error).toBeNull();
    expect(guestAuth.error).toBeNull();
    hostId = hostAuth.data.user!.id;
    guestId = guestAuth.data.user!.id;
  });

  it("has trigger-created profiles and blocks player content mutation", async () => {
    const [{ data: profile }, mutation] = await Promise.all([
      host.from("profiles").select("id,role").eq("id", hostId).single(),
      host
        .from("typing_texts")
        .update({ title: "Perubahan yang harus ditolak" })
        .not("id", "is", null),
    ]);
    expect(profile).toMatchObject({ id: hostId, role: "player" });
    expect(mutation.error).not.toBeNull();
  });

  it("starts, finishes, and idempotently returns one practice result", async () => {
    const started = await host.rpc("start_practice", {
      p_mode: "quote",
      p_difficulty: null,
      p_category_id: null,
    });
    expect(started.error).toBeNull();
    const session = started.data![0];
    const waitMs =
      Math.max(0, new Date(session.started_at).getTime() - Date.now()) + 3200;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const payload = {
      p_session_id: session.session_id,
      p_current_character: session.content.length,
      p_incorrect_keystrokes: 0,
      p_total_keystrokes: session.content.length,
      p_client_duration_ms: 3200,
      p_focus_losses: 0,
      p_integrity_events: [],
    };
    const first = await host.rpc("finish_practice", payload);
    const duplicate = await host.rpc("finish_practice", payload);
    expect(first.error).toBeNull();
    expect(duplicate.error).toBeNull();
    expect(duplicate.data.duplicate).toBe(true);
    const next = await host.rpc("start_practice", {
      p_mode: "quote",
      p_difficulty: null,
      p_category_id: null,
    });
    expect(next.error).toBeNull();
    expect(next.data![0].text_id).not.toBe(session.text_id);
  }, 20_000);

  it("creates, joins, readies, starts, finishes, and deduplicates a race", async () => {
    const created = await host.rpc("create_race_room", {
      p_name: "Vitest Live Race",
      p_visibility: "private",
      p_max_players: 2,
      p_difficulty: null,
      p_category_id: null,
    });
    expect(created.error).toBeNull();
    const roomId = created.data.id;
    const joined = await guest.rpc("join_race_room", {
      p_code: created.data.code,
    });
    expect(joined.error).toBeNull();
    await Promise.all([
      host.rpc("set_race_ready", { p_room_id: roomId, p_ready: true }),
      guest.rpc("set_race_ready", { p_room_id: roomId, p_ready: true }),
    ]);
    const started = await host.rpc("start_race", { p_room_id: roomId });
    expect(started.error).toBeNull();
    const content = String(started.data.text.content);
    const [{ data: hostParticipant }, { data: guestParticipant }] =
      await Promise.all([
        host
          .from("race_participants")
          .select("finish_nonce")
          .eq("race_room_id", roomId)
          .eq("user_id", hostId)
          .single(),
        guest
          .from("race_participants")
          .select("finish_nonce")
          .eq("race_room_id", roomId)
          .eq("user_id", guestId)
          .single(),
      ]);
    const waitMs =
      Math.max(0, new Date(started.data.startsAt).getTime() - Date.now()) +
      3200;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const finishPayload = (nonce: string) => ({
      p_room_id: roomId,
      p_nonce: nonce,
      p_current_character: content.length,
      p_incorrect_keystrokes: 0,
      p_total_keystrokes: content.length,
      p_client_duration_ms: 3200,
      p_focus_losses: 0,
      p_integrity_events: [],
    });
    const hostFinish = await host.rpc(
      "finish_race",
      finishPayload(hostParticipant!.finish_nonce),
    );
    const duplicate = await host.rpc(
      "finish_race",
      finishPayload(hostParticipant!.finish_nonce),
    );
    const guestFinish = await guest.rpc(
      "finish_race",
      finishPayload(guestParticipant!.finish_nonce),
    );
    expect(hostFinish.error).toBeNull();
    expect(duplicate.data.duplicate).toBe(true);
    expect(guestFinish.error).toBeNull();
    expect(
      new Set([hostFinish.data.placement, guestFinish.data.placement]).size,
    ).toBe(2);
  }, 25_000);
});
