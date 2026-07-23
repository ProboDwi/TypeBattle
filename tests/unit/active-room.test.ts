import { describe, expect, it } from "vitest";
import { normalizeActiveRaceRoom } from "@/lib/race/active-room";

const activeRoom = {
  room_id: "cda55313-33b6-4fcb-8920-f2b838647bc3",
  code: "A7K2MN",
  name: "Sprint malam",
  status: "waiting",
  visibility: "private",
  is_host: true,
  expires_at: "2026-07-23T20:00:00.000Z",
  created_at: "2026-07-23T18:00:00.000Z",
};

describe("active room recovery", () => {
  it("normalizes the table-returning RPC response", () => {
    expect(normalizeActiveRaceRoom([activeRoom])).toEqual({
      roomId: activeRoom.room_id,
      code: activeRoom.code,
      name: activeRoom.name,
      status: "waiting",
      visibility: "private",
      isHost: true,
      expiresAt: activeRoom.expires_at,
      createdAt: activeRoom.created_at,
    });
  });

  it("rejects empty and malformed responses", () => {
    expect(normalizeActiveRaceRoom([])).toBeNull();
    expect(normalizeActiveRaceRoom([{ ...activeRoom, code: null }])).toBeNull();
  });
});
