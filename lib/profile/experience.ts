export function experienceForLevel(level: number): number {
  return 100 * Math.max(0, level - 1) ** 2;
}

export function levelFromExperience(experience: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, experience) / 100)) + 1);
}

export function getLevelProgress(experience: number) {
  const level = levelFromExperience(experience);
  const currentFloor = experienceForLevel(level);
  const nextFloor = experienceForLevel(level + 1);
  return {
    level,
    current: experience - currentFloor,
    required: nextFloor - currentFloor,
    percentage:
      ((experience - currentFloor) / Math.max(1, nextFloor - currentFloor)) *
      100,
  };
}
