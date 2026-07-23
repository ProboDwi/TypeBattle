const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
