import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raceClient = readFileSync(
  resolve("components/race/race-room-client.tsx"),
  "utf8",
);

describe("race countdown", () => {
  it("shows the server-timed countdown before typing starts", () => {
    expect(raceClient).toContain('{room.status === "countdown" && (');
    expect(raceClient).not.toContain(
      'room.status === "countdown" && !typing.started',
    );
    expect(raceClient).toContain("Balapan segera dimulai");
    expect(raceClient).toContain('{countdown || "GO"}');
  });

  it("restores countdown text without starting the typing engine early", () => {
    expect(raceClient).toContain("started:");
    expect(raceClient).toContain('initialRoom.status === "racing"');
  });

  it("applies and broadcasts the server countdown without waiting for refresh", () => {
    expect(raceClient).toContain("const applyRaceCountdown");
    expect(raceClient).toContain(
      '.on("broadcast", { event: "race_countdown" }',
    );
    expect(raceClient).toContain(
      'await broadcast("race_countdown", result.data)',
    );
  });

  it("uses a five-second monotonic countdown independent of device clock skew", () => {
    expect(raceClient).toContain("useState(5)");
    expect(raceClient).toContain("countdownDeadlineRef");
    expect(raceClient).toContain(
      "performance.now() + countdownSeconds * 1000",
    );
  });
});
