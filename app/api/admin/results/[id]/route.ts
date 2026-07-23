import { apiError, apiSuccess } from "@/lib/api-response";
import { getApiAdmin } from "@/lib/supabase/api-admin";
import { moderationSchema } from "@/lib/validation/admin";

export async function PUT(
  request: Request,
  context: RouteContext<"/api/admin/results/[id]">,
) {
  const { id } = await context.params;
  const parsed = moderationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError("Keputusan moderasi tidak valid.", 422);
  try {
    const auth = await getApiAdmin();
    if (!auth) return apiError("Akses admin diperlukan.", 403);
    const { error } = await auth.supabase.rpc("admin_moderate_result", {
      p_result_id: id,
      p_type: parsed.data.type,
      p_valid: parsed.data.valid,
      p_note: parsed.data.note || null,
    });
    if (error) return apiError("Keputusan belum dapat disimpan.", 400);
    return apiSuccess({}, "Keputusan moderasi disimpan.");
  } catch {
    return apiError("Layanan admin belum tersedia.", 503);
  }
}
