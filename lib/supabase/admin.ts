import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY belum dikonfigurasi di server.");
  }

  const { url } = getPublicEnv();
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
