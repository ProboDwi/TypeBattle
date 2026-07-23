export type UserRole = "player" | "admin";
export type Difficulty = "easy" | "medium" | "hard";
export type PracticeMode = "quote" | "timed_30" | "timed_60" | "daily";
export type RaceStatus =
  "waiting" | "countdown" | "racing" | "finished" | "cancelled";

export interface PublicProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_seed: string;
  level: number;
  rating: number;
  best_wpm: number;
  average_wpm: number;
  average_accuracy: number;
  total_practices: number;
  total_races: number;
  total_wins: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  value: number;
  accuracy?: number;
  recordedAt?: string;
}
