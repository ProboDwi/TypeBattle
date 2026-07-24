import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raceRoomClient = readFileSync(
  resolve("components/race/race-room-client.tsx"),
  "utf8",
);

describe("race room realtime contract", () => {
  it("refreshes verified participants when presence changes", () => {
    const presenceSync = raceRoomClient.slice(
      raceRoomClient.indexOf('.on("presence", { event: "sync" }'),
      raceRoomClient.indexOf(
        '.on("broadcast", { event: "state_changed" }',
      ),
    );

    expect(presenceSync).toContain("refreshVerifiedState()");
  });
});
