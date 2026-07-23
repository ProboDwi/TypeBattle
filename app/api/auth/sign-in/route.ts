import { apiError, apiSuccess } from "@/lib/api-response";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const identifier =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (
    !(await consumeRateLimit({
      identifier,
      action: "sign-in",
      limit: 8,
      windowSeconds: 600,
    }))
  ) {
    return apiError(
      "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.",
      429,
    );
  }
  const parsed = signInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError(
      "Periksa kembali data masuk.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return apiError("Email atau password tidak cocok.", 401);
    return apiSuccess({ redirectTo: "/dashboard" }, "Selamat datang kembali.");
  } catch {
    return apiError(
      "Layanan autentikasi belum tersedia. Periksa konfigurasi Supabase.",
      503,
    );
  }
}
