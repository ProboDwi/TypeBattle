import { apiError, apiSuccess } from "@/lib/api-response";
import { getApiAdmin } from "@/lib/supabase/api-admin";
import { userRoleSchema } from "@/lib/validation/admin";

export async function PUT(
  request: Request,
  context: RouteContext<"/api/admin/users/[id]">,
) {
  const { id } = await context.params;
  const parsed = userRoleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError("Role tidak valid.", 422);
  try {
    const auth = await getApiAdmin();
    if (!auth) return apiError("Akses admin diperlukan.", 403);
    if (id === auth.user.id && parsed.data.role !== "admin")
      return apiError(
        "Admin tidak dapat menurunkan role dirinya sendiri.",
        409,
      );
    const { error } = await auth.supabase.rpc("admin_set_user_role", {
      p_user_id: id,
      p_role: parsed.data.role,
    });
    if (error) return apiError("Role belum dapat disimpan.", 400);
    return apiSuccess({}, "Role pengguna disimpan.");
  } catch {
    return apiError("Layanan admin belum tersedia.", 503);
  }
}
