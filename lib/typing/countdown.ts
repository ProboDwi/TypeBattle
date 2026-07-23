export function getCountdownSeconds(startsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((startsAtMs - nowMs) / 1000));
}

export function hasCountdownFinished(
  startsAtMs: number,
  nowMs: number,
): boolean {
  return nowMs >= startsAtMs;
}
