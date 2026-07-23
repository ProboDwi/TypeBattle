import { cn } from "@/lib/utils/cn";

function hashSeed(seed: string): number {
  return [...seed].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    17,
  );
}

export function Avatar({
  seed,
  label,
  className,
}: {
  seed: string;
  label: string;
  className?: string;
}) {
  const hash = hashSeed(seed);
  const palette = ["#E95D2A", "#3D6B57", "#191B1F", "#B84038"];
  const background = palette[hash % palette.length];
  const rotation = (hash % 5) * 18;

  return (
    <span
      className={cn(
        "relative inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-[7px] border border-ink/20",
        className,
      )}
      style={{ background }}
      aria-label={`Avatar ${label}`}
      role="img"
    >
      <span
        aria-hidden="true"
        className="block size-4 border-2 border-white/90"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    </span>
  );
}
