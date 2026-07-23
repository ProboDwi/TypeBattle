export function calculateWpm(
  correctCharacters: number,
  elapsedMs: number,
): number {
  if (correctCharacters <= 0 || elapsedMs <= 0) return 0;
  return correctCharacters / 5 / (elapsedMs / 60_000);
}

export function calculateAccuracy(
  correctKeystrokes: number,
  totalKeystrokes: number,
): number {
  if (totalKeystrokes <= 0) return 100;
  return Math.max(
    0,
    Math.min(100, (correctKeystrokes / totalKeystrokes) * 100),
  );
}

export function calculateProgress(
  currentCharacter: number,
  totalCharacters: number,
): number {
  if (totalCharacters <= 0) return 0;
  return Math.max(0, Math.min(100, (currentCharacter / totalCharacters) * 100));
}
