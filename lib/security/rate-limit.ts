import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";

export async function consumeRateLimit({
  identifier,
  action,
  limit,
  windowSeconds,
}: {
  identifier: string;
  action: string;
  limit: number;
  windowSeconds: number;
}): Promise<boolean> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SECRET_KEY) return true;
  const rateKey = createHash("sha256").update(identifier).digest("hex");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: rateKey,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}
