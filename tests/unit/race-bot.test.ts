import { describe, expect, it } from "vitest";
import {
  getBotRaceDurationMs,
  getBotRaceProgress,
  QUICK_RACE_BOT_WAIT_MS,
} from "@/lib/race/bot";

describe("Quick Race bot", () => {
  it("waits ten seconds before using the fallback bot", () => {
    expect(QUICK_RACE_BOT_WAIT_MS).toBe(10_000);
  });

  it("turns target WPM into a deterministic finish duration", () => {
    expect(getBotRaceDurationMs(200, 40)).toBe(60_000);
  });

  it("moves progressively and never passes the finish line", () => {
    expect(getBotRaceProgress(15_000, 60_000)).toBe(25);
    expect(getBotRaceProgress(90_000, 60_000)).toBe(100);
    expect(getBotRaceProgress(-1_000, 60_000)).toBe(0);
  });
});
