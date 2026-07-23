import { apiError, apiSuccess } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const parsed = resetPasswordSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Periksa password baru.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user)
      return apiError(
        "Tautan pemulihan tidak valid atau sudah kedaluwarsa.",
        401,
      );
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return apiError("Password belum dapat diperbarui.", 400);
    return apiSuccess(
      { redirectTo: "/dashboard" },
      "Password berhasil diperbarui.",
    );
  } catch {
    return apiError("Layanan autentikasi belum tersedia.", 503);
  }
}
