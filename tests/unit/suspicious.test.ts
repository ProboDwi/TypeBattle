import { describe, expect, it } from "vitest";
import { detectSuspiciousResult } from "@/lib/security/suspicious";

const clean = {
  correctCharacters: 200,
  incorrectKeystrokes: 5,
  totalKeystrokes: 205,
  clientDurationMs: 60_000,
  serverDurationMs: 61_000,
  wpm: 40,
  targetLength: 200,
  focusLosses: 1,
};
describe("suspicious result detection", () => {
  it("accepts a plausible result", () =>
    expect(detectSuspiciousResult(clean)).toEqual([]));
  it("flags paste, impossible counters, and extreme speed", () => {
    const flags = detectSuspiciousResult({
      ...clean,
      pasted: true,
      totalKeystrokes: 100,
      wpm: 240,
    });
    expect(flags).toContain("paste");
    expect(flags).toContain("inconsistent_keystrokes");
    expect(flags).toContain("implausible_speed");
  });
  it("flags duration drift and sequence regression", () => {
    const flags = detectSuspiciousResult({
      ...clean,
      clientDurationMs: 5_000,
      sequenceRegressed: true,
    });
    expect(flags).toContain("duration_mismatch");
    expect(flags).toContain("sequence_regressed");
  });
});
