import { apiError, apiSuccess } from "@/lib/api-response";
import { hasSupabaseEnv } from "@/lib/env";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { fallbackTexts } from "@/lib/typing/fallback-texts";
import { pickRandomAvoidingPrevious } from "@/lib/typing/random-text";
import { startPracticeSchema } from "@/lib/validation/practice";

export async function POST(request: Request) {
  const parsed = startPracticeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(
      "Pilihan latihan tidak valid.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  if (!hasSupabaseEnv()) {
    const preferred = parsed.data.difficulty
      ? fallbackTexts.filter(
          (text) => text.difficulty === parsed.data.difficulty,
        )
      : fallbackTexts;
    const text =
      pickRandomAvoidingPrevious(preferred, parsed.data.excludeTextId) ??
      pickRandomAvoidingPrevious(fallbackTexts, parsed.data.excludeTextId) ??
      fallbackTexts[0];
    return apiSuccess(
      {
        sessionId: null,
        text,
        startedAt: new Date(Date.now() + 3000).toISOString(),
        guest: true,
      },
      "Mode lokal aktif. Hasil tidak masuk leaderboard.",
    );
  }
  let authenticatedRequest = false;
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError")
      return apiError(
        "Sesi login belum dapat diverifikasi. Muat ulang halaman lalu coba lagi.",
        503,
      );
    authenticatedRequest = Boolean(authData.user);
    const identifier =
      authData.user?.id ??
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      "guest";
    if (
      !(await consumeRateLimit({
        identifier,
        action: "practice-start",
        limit: 20,
        windowSeconds: 60,
      }))
    )
      return apiError("Terlalu banyak sesi baru. Tunggu sebentar.", 429);
    if (authData.user) {
      const { data, error } = await supabase.rpc("start_practice", {
        p_mode: parsed.data.mode,
        p_difficulty: parsed.data.difficulty ?? null,
        p_category_id: parsed.data.categoryId ?? null,
      });
      if (error || !data?.[0])
        return apiError("Teks latihan belum tersedia untuk pilihan ini.", 404);
      const row = data[0];
      return apiSuccess({
        sessionId: row.session_id,
        text: {
          id: row.text_id,
          title: row.title,
          content: row.content,
          difficulty: row.difficulty,
          categoryName: row.category_name,
        },
        startedAt: row.started_at,
        guest: false,
      });
    }
    let query = supabase
      .from("typing_texts")
      .select("id,title,content,difficulty,text_categories(name)")
      .eq("status", "published");
    if (parsed.data.categoryId)
      query = query.eq("category_id", parsed.data.categoryId);
    const { data } = await query;
    const categoryPool = data ?? [];
    const preferredPool = parsed.data.difficulty
      ? categoryPool.filter(
          (text) => text.difficulty === parsed.data.difficulty,
        )
      : categoryPool;
    const row =
      pickRandomAvoidingPrevious(preferredPool, parsed.data.excludeTextId) ??
      pickRandomAvoidingPrevious(categoryPool, parsed.data.excludeTextId);
    const preferredFallbacks = fallbackTexts.filter(
      (text) =>
        !parsed.data.difficulty || text.difficulty === parsed.data.difficulty,
    );
    const fallback =
      pickRandomAvoidingPrevious(
        preferredFallbacks,
        parsed.data.excludeTextId,
      ) ??
      pickRandomAvoidingPrevious(fallbackTexts, parsed.data.excludeTextId) ??
      fallbackTexts[0];
    const relation = row?.text_categories as { name?: string } | null;
    const text = row
      ? {
          id: String(row.id),
          title: String(row.title),
          content: String(row.content),
          difficulty: row.difficulty,
          categoryName: relation?.name ?? "Umum",
        }
      : fallback;
    return apiSuccess({
      sessionId: null,
      text,
      startedAt: new Date(Date.now() + 3000).toISOString(),
      guest: true,
    });
  } catch {
    if (authenticatedRequest)
      return apiError(
        "Koneksi database terputus. Latihan resmi belum dimulai agar hasil akun tidak hilang.",
        503,
      );
    const text =
      pickRandomAvoidingPrevious(fallbackTexts, parsed.data.excludeTextId) ??
      fallbackTexts[0];
    return apiSuccess(
      {
        sessionId: null,
        text,
        startedAt: new Date(Date.now() + 3000).toISOString(),
        guest: true,
      },
      "Koneksi database tidak tersedia. Mode lokal aktif.",
    );
  }
}
