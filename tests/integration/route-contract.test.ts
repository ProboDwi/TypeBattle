import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const requiredRoutes = [
  "app/api/practice/start/route.ts",
  "app/api/practice/[id]/finish/route.ts",
  "app/api/races/route.ts",
  "app/api/races/active/route.ts",
  "app/api/races/join/route.ts",
  "app/api/races/[id]/ready/route.ts",
  "app/api/races/[id]/start/route.ts",
  "app/api/races/[id]/finish/route.ts",
  "app/api/races/[id]/sync/route.ts",
  "app/api/matchmaking/join/route.ts",
  "app/api/matchmaking/bot/route.ts",
];

describe("server route integration contract", () => {
  it.each(requiredRoutes)("implements %s", (route) =>
    expect(existsSync(resolve(route))).toBe(true),
  );
  it("validates and authorizes admin mutations inside the endpoint", () => {
    const source = readFileSync(
      resolve("app/api/admin/texts/[id]/route.ts"),
      "utf8",
    );
    expect(source).toContain("typingTextSchema.safeParse");
    expect(source).toContain("getApiAdmin()");
  });
  it("uses a nonce and database RPC for race finish idempotency", () => {
    const source = readFileSync(
      resolve("app/api/races/[id]/finish/route.ts"),
      "utf8",
    );
    expect(source).toContain("p_nonce");
    expect(source).toContain('rpc("finish_race"');
  });
  it("does not silently downgrade authenticated practice failures to guest results", () => {
    const startSource = readFileSync(
      resolve("app/api/practice/start/route.ts"),
      "utf8",
    );
    const finishSource = readFileSync(
      resolve("app/api/practice/[id]/finish/route.ts"),
      "utf8",
    );
    expect(startSource).toContain("authenticatedRequest");
    expect(startSource).toContain("Latihan resmi belum dimulai");
    expect(finishSource).toContain("Hasil resmi belum tersimpan ke akun");
  });
  it("keeps manually created rooms private and reserves public rooms for matchmaking", () => {
    const createRoute = readFileSync(resolve("app/api/races/route.ts"), "utf8");
    const createForm = readFileSync(
      resolve("components/race/room-forms.tsx"),
      "utf8",
    );

    expect(createRoute).toContain('p_visibility: "private"');
    expect(createForm).not.toContain('<option value="public">');
    expect(createForm).toContain(
      "Room public dibuat otomatis melalui Quick Race.",
    );
  });
});
