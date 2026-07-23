import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getApiAuth } from "@/lib/supabase/api-auth";

export async function getApiAdmin() {
  const auth = await getApiAuth();
  if (!auth) return null;
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return { ...auth, admin: createAdminClient() };
}

export async function writeAdminAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown>,
) {
  const admin = createAdminClient();
  await admin.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}
