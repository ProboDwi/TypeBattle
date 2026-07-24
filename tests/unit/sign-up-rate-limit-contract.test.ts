import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const signUpRoute = readFileSync(
  resolve("app/api/auth/sign-up/route.ts"),
  "utf8",
);

describe("sign-up rate limiting", () => {
  it("validates input before consuming rate limits", () => {
    const validationIndex = signUpRoute.indexOf(
      "signUpSchema.safeParse",
    );
    const rateLimitIndex = signUpRoute.indexOf(
      "const [ipAllowed, emailAllowed]",
    );

    expect(validationIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeGreaterThan(validationIndex);
  });

  it("separates shared-IP and per-email abuse limits", () => {
    expect(signUpRoute).toContain('action: "sign-up-ip"');
    expect(signUpRoute).toContain("limit: 20");
    expect(signUpRoute).toContain('action: "sign-up-email"');
    expect(signUpRoute).toContain("limit: 5");
  });
});
