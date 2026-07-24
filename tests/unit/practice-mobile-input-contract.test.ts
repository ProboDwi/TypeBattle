import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const practiceGame = readFileSync(
  resolve("components/game/practice-game.tsx"),
  "utf8",
);

describe("practice mobile input layout", () => {
  it("keeps the mobile capture over the text instead of at the page footer", () => {
    expect(practiceGame).toContain('className="absolute inset-0 z-[2]');
    expect(practiceGame).not.toContain('className="fixed bottom-0 left-1/2');
  });
});
