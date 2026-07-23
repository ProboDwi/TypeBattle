import { ModerateResult } from "@/components/admin/admin-actions";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Hasil Mencurigakan" };
export default async function AdminResultsPage() {
  const supabase = await createClient();
  const [{ data: practices }, { data: races }] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select(
        "id,wpm,accuracy,duration_ms,suspicious_reason,created_at,profiles(username)",
      )
      .eq("suspicious", true)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("race_results")
      .select(
        "id,wpm,accuracy,duration_ms,suspicious_reason,created_at,profiles(username)",
      )
      .eq("suspicious", true)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const rows = [
    ...(practices ?? []).map((item) => ({
      ...item,
      type: "practice" as const,
    })),
    ...(races ?? []).map((item) => ({ ...item, type: "race" as const })),
  ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return (
    <>
      <p className="eyebrow">Moderasi / integrity</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
        Hasil mencurigakan.
      </h1>
      <p className="mt-2 mb-7 text-muted">
        Keputusan admin dicatat di audit log. Validasi tidak menghitung ulang
        statistik lama secara otomatis.
      </p>
      <section className="panel overflow-hidden">
        {rows.length ? (
          rows.map((row) => {
            const profile = row.profiles as { username?: string } | null;
            return (
              <div
                key={`${row.type}-${row.id}`}
                className="grid gap-4 border-b border-line p-5 last:border-0 md:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p className="font-bold">
                    @{profile?.username ?? "unknown"} · {row.type}
                  </p>
                  <p className="mt-1 text-sm text-danger">
                    {row.suspicious_reason || "Tidak ada alasan terperinci"}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {formatDate(String(row.created_at))}
                  </p>
                </div>
                <p className="font-mono text-sm">
                  {Math.round(Number(row.wpm))} WPM
                  <br />
                  <span className="text-muted">
                    {formatNumber(Number(row.accuracy))}% ·{" "}
                    {Math.round(Number(row.duration_ms) / 1000)} dtk
                  </span>
                </p>
                <ModerateResult id={String(row.id)} type={row.type} />
              </div>
            );
          })
        ) : (
          <div className="p-14 text-center">
            <p className="font-bold">Tidak ada hasil mencurigakan.</p>
            <p className="mt-2 text-sm text-muted">
              Lintasan bersih untuk saat ini.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
