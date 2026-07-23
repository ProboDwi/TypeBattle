import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnv, hasSupabaseEnv } from "@/lib/env";

describe("public environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects direct NEXT_PUBLIC Supabase values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://project.supabase.co ");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      " sb_publishable_example ",
    );

    expect(hasSupabaseEnv()).toBe(true);
    expect(getPublicEnv()).toEqual({
      url: "https://project.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("rejects an incomplete browser configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(hasSupabaseEnv()).toBe(false);
    expect(() => getPublicEnv()).toThrow("Supabase belum dikonfigurasi");
  });
});
