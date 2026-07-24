import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const callbackRoute = readFileSync(
  resolve("app/auth/callback/route.ts"),
  "utf8",
);
const confirmationPage = readFileSync(
  resolve("app/auth/confirm/page.tsx"),
  "utf8",
);

describe("email authentication callback", () => {
  it("supports token-hash verification for cross-device email confirmation", () => {
    expect(callbackRoute).toContain(
      'url.searchParams.get("token_hash")',
    );
    expect(callbackRoute).toContain("supabase.auth.verifyOtp");
    expect(callbackRoute).toContain("token_hash: tokenHash");
  });

  it("keeps the PKCE code exchange fallback", () => {
    expect(callbackRoute).toContain("supabase.auth.exchangeCodeForSession");
  });

  it("waits for an explicit POST before consuming scanner-sensitive tokens", () => {
    expect(callbackRoute).toContain("export async function POST");
    expect(confirmationPage).toContain('action="/auth/callback"');
    expect(confirmationPage).toContain('method="post"');
    expect(confirmationPage).toContain('name="token_hash"');
    expect(confirmationPage).toContain("Konfirmasi akun");
  });
});
