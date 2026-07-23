import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/types/app";

export async function getLandingLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leaderboard_wpm")
      .select("user_id,username,display_name,wpm,accuracy,finished_at")
      .order("wpm", { ascending: false })
      .limit(5);

    if (error || !data) return [];

    return data.map((entry, index) => ({
      rank: index + 1,
      userId: String(entry.user_id),
      username: String(entry.username),
      displayName: String(entry.display_name),
      value: Number(entry.wpm),
      accuracy: Number(entry.accuracy),
      recordedAt: String(entry.finished_at),
    }));
  } catch {
    return [];
  }
}
