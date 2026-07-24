export function getRaceMarkerLeft(progress: number) {
  const normalized = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : 0;

  return `clamp(7px, ${normalized}%, calc(100% - 7px))`;
}
