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

  it("records provisioning failures in server logs", () => {
    expect(botRoute).toContain(
      'console.error("[matchmaking/bot] Gagal menyiapkan KeyBot", error)',
    );
  });
});
