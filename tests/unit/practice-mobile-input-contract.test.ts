import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const practiceGame = readFileSync(
  resolve("components/game/practice-game.tsx"),
  "utf8",
);

describe("practice mobile input layout", () => {
  it("uses the same single in-place typing capture pattern as race mode", () => {
    expect(practiceGame.match(/<TypingCapture/g)).toHaveLength(1);
    expect(practiceGame).toContain("inputRef={inputRef}");
    expect(practiceGame).toContain("onClick={focusInput}");
    expect(practiceGame).not.toContain("mobileInputRef");
    expect(practiceGame).not.toContain("practice-mobile-input");
  });
});
