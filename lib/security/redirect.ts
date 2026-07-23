export function safeInternalPath(
  requested: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!requested || !requested.startsWith("/")) return fallback;
  if (requested.startsWith("//") || requested.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(requested)) return fallback;

  try {
    const parsed = new URL(requested, "https://keylane.invalid");
    if (parsed.origin !== "https://keylane.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
