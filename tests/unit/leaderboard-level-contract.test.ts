import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const leaderboardPage = readFileSync(
  resolve("app/leaderboard/page.tsx"),
  "utf8",
);

describe("level leaderboard", () => {
  it("offers a level tab and orders equal levels by experience", () => {
    expect(leaderboardPage).toContain(
      '{ value: "level", label: "Level pengguna" }',
    );
    expect(leaderboardPage).toContain('.from("leaderboard_level")');
    expect(leaderboardPage).toContain('.order("level", { ascending: false })');
    expect(leaderboardPage).toContain(
      '.order("experience", { ascending: false })',
    );
  });
});
