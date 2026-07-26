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
const raceFinishReliability = readFileSync(
  resolve("supabase/migrations/202607240014_race_finish_reliability.sql"),
  "utf8",
);
const atomicRaceFinish = readFileSync(
  resolve("supabase/migrations/202607240015_atomic_race_finish.sql"),
  "utf8",
);
const levelLeaderboard = readFileSync(
  resolve("supabase/migrations/202607240016_level_leaderboard.sql"),
  "utf8",
);
const hostControlledStart = readFileSync(
  resolve("supabase/migrations/202607240017_host_controlled_race_start.sql"),
  "utf8",
);
const fiveSecondRaceCountdown = readFileSync(
  resolve("supabase/migrations/202607240018_five_second_race_countdown.sql"),
  "utf8",
);
const quickRaceBot = readFileSync(
  resolve("supabase/migrations/202607260019_quick_race_bot.sql"),
  "utf8",
);
const multipleQuickRaceBots = readFileSync(
  resolve("supabase/migrations/202607260020_multiple_quick_race_bots.sql"),
  "utf8",
);
const threePlayerQuickRace = readFileSync(
  resolve("supabase/migrations/202607260021_three_player_quick_race.sql"),
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
  it("waits for racers and only marks long-idle participants as DNF", () => {
    expect(raceFinishReliability).toContain(
      "create or replace function public.protect_profile_fields",
    );
    expect(raceFinishReliability).toContain("greatest(600");
    expect(raceFinishReliability).toContain("interval '2 minutes'");
    expect(raceFinishReliability).toContain(
      "where race_room_id = room.id and race_status = 'racing'",
    );
  });
  it("persists a complete race atomically and tolerates reordered snapshots", () => {
    expect(atomicRaceFinish).toContain(
      "create or replace function public.finish_race",
    );
    expect(atomicRaceFinish).toContain("'sequence_regressed'");
    expect(atomicRaceFinish).toContain("target.character_count");
    expect(atomicRaceFinish).toContain("'duplicate', true");
  });
  it("publishes a level leaderboard ordered by level and experience", () => {
    expect(levelLeaderboard).toContain(
      "create or replace view public.leaderboard_level",
    );
    expect(levelLeaderboard).toContain("order by level desc, experience desc");
    expect(levelLeaderboard).toContain(
      "grant select on public.leaderboard_level to anon, authenticated",
    );
  });
  it("keeps readiness separate from the host-controlled race start", () => {
    expect(hostControlledStart).toContain(
      "create or replace function public.set_race_ready",
    );
    expect(hostControlledStart).toContain(
      "Starting is always an explicit host",
    );
    expect(hostControlledStart).toContain(
      "jsonb_build_object('ready', p_ready, 'started', false)",
    );
    expect(hostControlledStart).not.toContain("status = 'countdown'");
  });

  it("uses a five-second countdown for new and waiting race rooms", () => {
    expect(fiveSecondRaceCountdown).toContain(
      "alter column countdown_seconds set default 5",
    );
    expect(fiveSecondRaceCountdown).toContain("set countdown_seconds = 5");
    expect(fiveSecondRaceCountdown).toContain("where status = 'waiting'");
  });

  it("adds an authoritative fallback bot without exposing it on leaderboards", () => {
    expect(quickRaceBot).toContain(
      "function public.matchmake_with_bot(p_bot_user_id uuid)",
    );
    expect(quickRaceBot).toContain(
      "function public.finish_due_race_bot(p_room_id uuid)",
    );
    expect(quickRaceBot).toContain("interval '10 seconds'");
    expect(quickRaceBot).toContain("where not is_bot");
    expect(quickRaceBot).toContain("'Quick Race vs KeyBot'");
  });

  it("introduces support for multiple bot participants", () => {
    expect(multipleQuickRaceBots).toContain(
      "function public.matchmake_with_bots(p_bot_user_ids uuid[])",
    );
    expect(multipleQuickRaceBots).toContain("cardinality(p_bot_user_ids) < 2");
    expect(multipleQuickRaceBots).toContain("'botCount', bot_count");
    expect(multipleQuickRaceBots).toContain("'playerCount', bot_count + 1");
  });

  it("fills every Quick Race to exactly three participants, prioritizing humans", () => {
    expect(threePlayerQuickRace).toContain(
      "candidate_ids uuid[] := '{}'::uuid[]",
    );
    expect(threePlayerQuickRace).toContain(
      "required_bot_count := 2 - human_opponent_count",
    );
    expect(threePlayerQuickRace).toContain(
      "if cardinality(candidate_ids) < 2 then",
    );
    expect(threePlayerQuickRace).toContain("'humanCount', 3");
    expect(threePlayerQuickRace).toContain("'playerCount', 3");
    expect(threePlayerQuickRace).toContain(
      "when required_bot_count = 1 then 'mixed'",
    );
    expect(threePlayerQuickRace).toContain(
      "pg_catalog.pg_advisory_xact_lock",
    );
  });
});
