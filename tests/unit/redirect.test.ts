import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/security/redirect";

describe("safe internal redirects", () => {
  it("keeps local paths including query strings", () => {
    expect(safeInternalPath("/race/ABC234?from=invite")).toBe(
      "/race/ABC234?from=invite",
    );
  });

  it.each([
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "javascript:alert(1)",
  ])("rejects unsafe target %s", (target) =>
    expect(safeInternalPath(target)).toBe("/dashboard"),
  );
});
