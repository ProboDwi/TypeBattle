import { describe, expect, it } from "vitest";
import {
  experienceForLevel,
  getLevelProgress,
  levelFromExperience,
} from "@/lib/profile/experience";

describe("experience levels", () => {
  it("uses the documented quadratic formula", () => {
    expect(experienceForLevel(1)).toBe(0);
    expect(experienceForLevel(4)).toBe(900);
  });
  it("derives a level consistently", () => {
    expect(levelFromExperience(0)).toBe(1);
    expect(levelFromExperience(400)).toBe(3);
  });
  it("reports progress inside the level", () =>
    expect(getLevelProgress(150)).toMatchObject({
      level: 2,
      current: 50,
      required: 300,
    }));
});
