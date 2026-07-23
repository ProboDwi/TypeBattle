import { apiError, apiSuccess } from "@/lib/api-response";
import { getApiAdmin, writeAdminAudit } from "@/lib/supabase/api-admin";
import { categorySchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  const parsed = categorySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Data kategori tidak valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const context = await getApiAdmin();
    if (!context) return apiError("Akses admin diperlukan.", 403);
    const { data, error } = await context.admin
      .from("text_categories")
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
      })
      .select()
      .single();
    if (error)
      return apiError(
        error.code === "23505"
          ? "Nama atau slug sudah digunakan."
          : "Kategori belum dapat dibuat.",
        400,
      );
    await writeAdminAudit(
      context.user.id,
      "category.create",
      "text_category",
      data.id,
      { slug: data.slug },
    );
    return apiSuccess(data, "Kategori dibuat.", 201);
  } catch {
    return apiError("Layanan admin belum tersedia.", 503);
  }
}
