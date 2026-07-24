import { describe, expect, it } from "vitest";
import { getRaceMarkerLeft } from "@/lib/race/progress";

describe("race marker position", () => {
  it("positions the marker against the track width", () => {
    expect(getRaceMarkerLeft(33)).toBe("clamp(7px, 33%, calc(100% - 7px))");
  });

  it("clamps progress to the track boundaries", () => {
    expect(getRaceMarkerLeft(-10)).toContain("7px, 0%");
    expect(getRaceMarkerLeft(120)).toContain("7px, 100%");
    expect(getRaceMarkerLeft(Number.NaN)).toContain("7px, 0%");
  });
});
