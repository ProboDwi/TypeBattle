export function ActionToast({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "success" | "error";
}) {
  if (!message) return null;
  const toneClass =
    tone === "error"
      ? "border-danger bg-danger text-white"
      : tone === "success"
        ? "border-moss bg-moss text-white"
        : "border-ink bg-ink text-paper";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-[8px] border px-4 py-3 text-sm shadow-sm ${toneClass}`}
    >
      {message}
    </div>
  );
}
