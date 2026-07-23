import { apiError, apiSuccess } from "@/lib/api-response";
import { getApiAdmin, writeAdminAudit } from "@/lib/supabase/api-admin";
import { categorySchema } from "@/lib/validation/admin";

export async function PUT(
  request: Request,
  context: RouteContext<"/api/admin/categories/[id]">,
) {
  const { id } = await context.params;
  const parsed = categorySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError("Data kategori tidak valid.", 422);
  try {
    const auth = await getApiAdmin();
    if (!auth) return apiError("Akses admin diperlukan.", 403);
    const { data, error } = await auth.admin
      .from("text_categories")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return apiError("Kategori belum dapat disimpan.", 400);
    await writeAdminAudit(
      auth.user.id,
      "category.update",
      "text_category",
      id,
      { slug: data.slug },
    );
    return apiSuccess(data, "Kategori disimpan.");
  } catch {
    return apiError("Layanan admin belum tersedia.", 503);
  }
}
export async function DELETE(
  _: Request,
  context: RouteContext<"/api/admin/categories/[id]">,
) {
  const { id } = await context.params;
  try {
    const auth = await getApiAdmin();
    if (!auth) return apiError("Akses admin diperlukan.", 403);
    const { error } = await auth.admin
      .from("text_categories")
      .delete()
      .eq("id", id);
    if (error)
      return apiError(
        error.code === "23503"
          ? "Kategori masih digunakan oleh teks."
          : "Kategori belum dapat dihapus.",
        409,
      );
    await writeAdminAudit(
      auth.user.id,
      "category.delete",
      "text_category",
      id,
      {},
    );
    return apiSuccess({}, "Kategori dihapus.");
  } catch {
    return apiError("Layanan admin belum tersedia.", 503);
  }
}
