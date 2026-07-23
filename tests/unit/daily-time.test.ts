import { describe, expect, it } from "vitest";
import {
  formatDailyCountdown,
  millisecondsUntilNextJakartaDay,
} from "@/lib/daily/time";

describe("daily challenge clock", () => {
  it("counts down to midnight in Asia/Jakarta", () => {
    const afternoonUtc = Date.UTC(2026, 6, 22, 10, 0, 0);
    expect(millisecondsUntilNextJakartaDay(afternoonUtc)).toBe(
      7 * 60 * 60 * 1000,
    );
  });

  it("formats a stable hour-minute-second value", () => {
    expect(formatDailyCountdown(3_661_000)).toBe("01:01:01");
  });
});
