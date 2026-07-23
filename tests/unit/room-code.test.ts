import { describe, expect, it } from "vitest";
import { generateRoomCode, isValidRoomCode } from "@/lib/race/room-code";

describe("room codes", () => {
  it("generates six unambiguous characters", () => {
    const code = generateRoomCode(() => 0.5);
    expect(code).toHaveLength(6);
    expect(isValidRoomCode(code)).toBe(true);
  });
  it("rejects O, 0, I, and 1", () => {
    expect(isValidRoomCode("O0I1AA")).toBe(false);
    expect(isValidRoomCode("ABC234")).toBe(true);
  });
});
