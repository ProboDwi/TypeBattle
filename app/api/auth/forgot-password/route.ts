import { apiError, apiSuccess } from "@/lib/api-response";
import { getSiteUrl } from "@/lib/env";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const identifier =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (
    !(await consumeRateLimit({
      identifier,
      action: "forgot-password",
      limit: 4,
      windowSeconds: 3600,
    }))
  ) {
    return apiError("Terlalu banyak permintaan. Coba lagi nanti.", 429);
  }
  const parsed = emailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError(
      "Masukkan alamat email yang valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/auth/reset-password`,
    });
    return apiSuccess(
      {},
      "Jika email terdaftar, tautan pemulihan segera dikirim.",
    );
  } catch {
    return apiError("Permintaan belum dapat diproses. Coba lagi nanti.", 503);
  }
}
