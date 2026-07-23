const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const jakartaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: JAKARTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function millisecondsUntilNextJakartaDay(nowMs: number): number {
  const parts = jakartaDateFormatter.formatToParts(new Date(nowMs));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1, -7);
  return Math.max(0, nextMidnightUtc - nowMs);
}

export function formatDailyCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
