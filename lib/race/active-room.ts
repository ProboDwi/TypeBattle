export interface ActiveRaceRoom {
  roomId: string;
  code: string;
  name: string;
  status: "waiting" | "countdown" | "racing";
  visibility: "public" | "private";
  isHost: boolean;
  expiresAt: string;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeActiveRaceRoom(value: unknown): ActiveRaceRoom | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate)) return null;

  const status = candidate.status;
  const visibility = candidate.visibility;
  if (
    typeof candidate.room_id !== "string" ||
    typeof candidate.code !== "string" ||
    typeof candidate.name !== "string" ||
    !["waiting", "countdown", "racing"].includes(String(status)) ||
    !["public", "private"].includes(String(visibility)) ||
    typeof candidate.is_host !== "boolean" ||
    typeof candidate.expires_at !== "string" ||
    typeof candidate.created_at !== "string"
  )
    return null;

  return {
    roomId: candidate.room_id,
    code: candidate.code,
    name: candidate.name,
    status: status as ActiveRaceRoom["status"],
    visibility: visibility as ActiveRaceRoom["visibility"],
    isHost: candidate.is_host,
    expiresAt: candidate.expires_at,
    createdAt: candidate.created_at,
  };
}
