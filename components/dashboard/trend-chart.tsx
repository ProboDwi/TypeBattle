export function TrendChart({
  values,
  label,
}: {
  values: number[];
  label: string;
}) {
  if (!values.length)
    return (
      <div className="grid h-48 place-items-center rounded-[7px] border border-dashed border-line bg-paper px-6 text-center text-sm text-muted">
        Belum cukup data untuk menampilkan {label.toLowerCase()}.
      </div>
    );
  const max = Math.max(...values, 1);
  return (
    <div
      className="flex h-48 items-end gap-2 border-b border-line px-2 pt-6"
      role="img"
      aria-label={`${label}: ${values.map((value) => Math.round(value)).join(", ")}`}
    >
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="group relative flex flex-1 items-end"
        >
          <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 font-mono text-[10px] group-hover:block">
            {Math.round(value)}
          </span>
          <span
            className="block w-full min-w-1 bg-moss transition-[height]"
            style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
