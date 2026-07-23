import { describe, expect, it } from "vitest";
import {
  calculateAccuracy,
  calculateProgress,
  calculateWpm,
} from "@/lib/typing/metrics";

describe("typing metrics", () => {
  it("calculates WPM from five-character words", () =>
    expect(calculateWpm(250, 60_000)).toBe(50));
  it("avoids division by zero", () => expect(calculateWpm(100, 0)).toBe(0));
  it("calculates accuracy", () => expect(calculateAccuracy(95, 100)).toBe(95));
  it("returns 100 accuracy before any key", () =>
    expect(calculateAccuracy(0, 0)).toBe(100));
  it("clamps progress", () => {
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(120, 100)).toBe(100);
  });
});
