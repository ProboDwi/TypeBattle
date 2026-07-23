import { describe, expect, it } from "vitest";
import { calculateRaceRatings } from "@/lib/race/rating";

describe("multiplayer rating", () => {
  it("rewards the winner and penalizes the loser deterministically", () => {
    const result = calculateRaceRatings([
      { id: "a", rating: 1000, placement: 1 },
      { id: "b", rating: 1000, placement: 2 },
    ]);
    expect(result[0].change).toBe(12);
    expect(result[1].change).toBe(-12);
  });
  it("caps changes", () => {
    const result = calculateRaceRatings(
      [
        { id: "a", rating: 3000, placement: 2 },
        { id: "b", rating: 500, placement: 1 },
      ],
      200,
      40,
    );
    expect(Math.abs(result[0].change)).toBeLessThanOrEqual(40);
  });
  it("does not change suspicious or DNF results", () => {
    const result = calculateRaceRatings([
      { id: "a", rating: 1000, placement: 1, suspicious: true },
      { id: "b", rating: 1000, placement: 2, dnf: true },
    ]);
    expect(result.map((item) => item.change)).toEqual([0, 0]);
  });
});
