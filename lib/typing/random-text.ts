export function pickRandomAvoidingPrevious<T extends { id: string }>(
  items: T[],
  previousId: string | null | undefined,
  random: () => number = Math.random,
): T | null {
  if (items.length === 0) return null;

  const alternatives = previousId
    ? items.filter((item) => item.id !== previousId)
    : items;
  if (alternatives.length === 0) return null;

  const pool = alternatives;
  const randomIndex = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(random() * pool.length)),
  );

  return pool[randomIndex] ?? null;
}
