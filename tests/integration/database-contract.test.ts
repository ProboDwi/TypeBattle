import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const initial = readFileSync(
  resolve("supabase/migrations/202607220001_initial_keylane.sql"),
  "utf8",
);
const race = readFileSync(
  resolve("supabase/migrations/202607220002_race_rls_views.sql"),
  "utf8",
);
const roomControls = readFileSync(
  resolve("supabase/migrations/202607220005_room_controls.sql"),
  "utf8",
);
const hardening = readFileSync(
  resolve("supabase/migrations/202607220009_completion_hardening.sql"),
  "utf8",
);
const textRotation = readFileSync(
  resolve("supabase/migrations/202607230010_avoid_consecutive_texts.sql"),
  "utf8",
);
const activeRoomRecovery = readFileSync(
  resolve("supabase/migrations/202607230011_active_room_recovery.sql"),
  "utf8",
);
const practiceFinishReliability = readFileSync(
  resolve("supabase/migrations/202607230012_practice_finish_reliability.sql"),
  "utf8",
);
const practiceStatusEnumFix = readFileSync(
  resolve("supabase/migrations/202607230013_fix_practice_status_enum.sql"),
  "utf8",
);

describe("Supabase integration contract", () => {
  it("creates profiles automatically after registration", () => {
    expect(initial).toContain("create trigger on_auth_user_created");
    expect(initial).toContain("execute function public.handle_new_user()");
  });
  it("exposes authoritative practice lifecycle functions", () => {
    expect(initial).toContain("function public.start_practice");
    expect(initial).toContain("function public.finish_practice");
    expect(initial).toContain("status = 'finished'");
  });
  it("implements create, join, ready, start, finish, and duplicate finish protection", () => {
    for (const name of [
      "create_race_room",
      "join_race_room",
      "start_race",
      "finish_race",
    ])
      expect(race).toContain(`function public.${name}`);
    expect(roomControls).toContain("function public.set_race_ready");
    expect(race).toContain("'duplicate', true");
  });
  it("keeps admin authorization and RLS in the database", () => {
    expect(initial).toContain("function public.is_admin");
    expect(race).toContain("enable row level security");
    expect(race).toContain("profiles_admin_update");
  });
  it("persists integrity events, synchronizes race state, and clamps rating", () => {
    expect(hardening).toContain("p_integrity_events text[]");
    expect(hardening).toContain("function public.sync_race_state");
    expect(hardening).toContain("rating_after := greatest(100, least(4000");
  });
  it("avoids the previous practice and race text when alternatives exist", () => {
    expect(textRotation).toContain("candidate.id <> previous_text_id");
    expect(textRotation).toContain("function public.pick_race_text");
    expect(textRotation).toContain("previous_room.typing_text_id is not null");
  });
  it("recovers active rooms and cleans expired rooms before create checks", () => {
    expect(activeRoomRecovery).toContain(
      "function public.get_active_race_room",
    );
    expect(activeRoomRecovery).toContain("pg_advisory_xact_lock");
    expect(activeRoomRecovery.indexOf("expires_at < now()")).toBeLessThan(
      activeRoomRecovery.indexOf("already in an active room"),
    );
  });
  it("allows trusted result functions to update protected profile totals", () => {
    expect(practiceFinishReliability).toContain(
      "current_user in ('authenticated', 'anon')",
    );
    expect(practiceFinishReliability).toContain(
      "protected profile fields cannot be updated directly",
    );
  });
  it("casts the computed practice status back to its PostgreSQL enum", () => {
    expect(practiceStatusEnumFix).toContain("::public.session_status");
    expect(practiceStatusEnumFix).toContain(
      "create or replace function public.finish_practice",
    );
  });
});
