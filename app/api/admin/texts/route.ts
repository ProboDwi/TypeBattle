import { apiError, apiSuccess } from "@/lib/api-response";
import { getApiAdmin, writeAdminAudit } from "@/lib/supabase/api-admin";
import { typingTextSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  const parsed = typingTextSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Data teks tidak valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const auth = await getApiAdmin();
    if (!auth) return apiError("Akses admin diperlukan.", 403);
    const { data, error } = await auth.admin
      .from("typing_texts")
      .insert({
        title: parsed.data.title,
        content: parsed.data.content,
        category_id: parsed.data.categoryId,
        difficulty: parsed.data.difficulty,
        status: parsed.data.status,
        source_label: parsed.data.sourceLabel || null,
        created_by: auth.user.id,
      })
      .select()
      .single();
    if (error) return apiError("Teks belum dapat dibuat.", 400);
    await writeAdminAudit(auth.user.id, "text.create", "typing_text", data.id, {
      status: data.status,
    });
    return apiSuccess(data, "Teks dibuat.", 201);
  } catch {
    return apiError("Layanan admin belum tersedia.", 503);
  }
}
