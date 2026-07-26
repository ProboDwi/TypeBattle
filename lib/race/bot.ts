export const QUICK_RACE_BOT_WAIT_MS = 10_000;

export function getBotRaceDurationMs(
  characterCount: number,
  targetWpm: number,
): number {
  if (characterCount <= 0 || targetWpm <= 0) return 0;
  return Math.max(3_000, Math.ceil((characterCount / 5 / targetWpm) * 60_000));
}

export function getBotRaceProgress(
  elapsedMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0) return 0;
  return Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
}
