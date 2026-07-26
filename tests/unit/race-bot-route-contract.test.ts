import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const botRoute = readFileSync(
  resolve("app/api/matchmaking/bot/route.ts"),
  "utf8",
);

describe("Quick Race bot provisioning", () => {
  it("uses a Supabase-compatible system password", () => {
    expect(botRoute).toContain("password: `Bot-${randomUUID()}`");
    expect(botRoute).not.toContain(
      "password: `${randomUUID()}-${randomUUID()}`",
    );
  });

  it("provisions two distinct system bots", () => {
    expect(botRoute).toContain("const BOT_ACCOUNTS = [");
    expect(botRoute).toContain("KeyBot Alpha");
    expect(botRoute).toContain("KeyBot Beta");
    expect(botRoute).toContain('rpc("matchmake_with_bots"');
    expect(botRoute).toContain("p_bot_user_ids: botIds");
  });

  it("records provisioning failures in server logs", () => {
    expect(botRoute).toContain(
      'console.error("[matchmaking/bot] Gagal menyiapkan KeyBot", error)',
    );
  });
});
