import { describe, expect, it } from "vitest";
import {
  getCountdownSeconds,
  hasCountdownFinished,
} from "@/lib/typing/countdown";

describe("timestamp countdown", () => {
  it("uses timestamps and rounds upward", () =>
    expect(getCountdownSeconds(4_000, 1_250)).toBe(3));
  it("never becomes negative", () =>
    expect(getCountdownSeconds(1_000, 2_000)).toBe(0));
  it("detects the exact start boundary", () =>
    expect(hasCountdownFinished(2_000, 2_000)).toBe(true));
});
