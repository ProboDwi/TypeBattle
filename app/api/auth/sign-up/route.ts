import { apiError, apiSuccess } from "@/lib/api-response";
import { getSiteUrl } from "@/lib/env";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const parsed = signUpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError(
      "Periksa kembali data pendaftaran.",
      422,
      parsed.error.flatten().fieldErrors,
    );

  const [ipAllowed, emailAllowed] = await Promise.all([
    consumeRateLimit({
      identifier: ipAddress,
      action: "sign-up-ip",
      limit: 20,
      windowSeconds: 3600,
    }),
    consumeRateLimit({
      identifier: parsed.data.email.trim().toLowerCase(),
      action: "sign-up-email",
      limit: 5,
      windowSeconds: 3600,
    }),
  ]);
  if (!ipAllowed || !emailAllowed) {
    return apiError(
      "Terlalu banyak percobaan pendaftaran. Tunggu beberapa saat lalu coba lagi.",
      429,
    );
  }

  try {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.data.username)
      .maybeSingle();
    if (existing)
      return apiError("Username tersebut sudah digunakan.", 409, {
        username: ["Pilih username lain."],
      });
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
        data: {
          username: parsed.data.username,
          display_name: parsed.data.displayName,
        },
      },
    });
    if (error)
      return apiError(
        "Pendaftaran belum berhasil. Periksa data lalu coba lagi.",
        400,
      );
    return apiSuccess(
      {
        requiresEmailConfirmation: !data.session,
        redirectTo: data.session ? "/dashboard" : "/auth/sign-in",
      },
      data.session
        ? "Akun berhasil dibuat."
        : "Akun dibuat. Periksa email untuk mengaktifkannya.",
      201,
    );
  } catch {
    return apiError(
      "Layanan autentikasi belum tersedia. Periksa konfigurasi Supabase.",
      503,
    );
  }
}
