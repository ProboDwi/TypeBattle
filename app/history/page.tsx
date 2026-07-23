import Link from "next/link";
import { AccountShell } from "@/components/dashboard/account-shell";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Histori" };
export const dynamic = "force-dynamic";
const filters = [
  { value: "all", label: "Semua" },
  { value: "practice", label: "Latihan" },
  { value: "race", label: "Race" },
  { value: "daily", label: "Tantangan harian" },
];

export default async function HistoryPage({
  searchParams,
}: PageProps<"/history">) {
  const viewer = await requireUser();
  const params = await searchParams;
  const filter = typeof params.filter === "string" ? params.filter : "all";
  const supabase = await createClient();
  const [{ data: profile }, { data: practices }, { data: races }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username,display_name,avatar_seed,role")
        .eq("id", viewer.user.id)
        .single(),
      filter === "race"
        ? Promise.resolve({ data: [] })
        : supabase
            .from("practice_sessions")
            .select("id,mode,wpm,accuracy,duration_ms,created_at,status")
            .eq("user_id", viewer.user.id)
            .in("status", ["finished", "invalid"])
            .order("created_at", { ascending: false })
            .limit(50),
      filter === "practice" || filter === "daily"
        ? Promise.resolve({ data: [] })
        : supabase
            .from("race_results")
            .select(
              "id,wpm,accuracy,duration_ms,placement,created_at,race_rooms(code,name)",
            )
            .eq("user_id", viewer.user.id)
            .order("created_at", { ascending: false })
            .limit(50),
    ]);
  const current = profile ?? viewer.profile;
  const practiceRows = (practices ?? [])
    .filter((item) => filter !== "daily" || item.mode === "daily")
    .map((item) => ({
      id: String(item.id),
      kind: item.mode === "daily" ? "Tantangan harian" : "Latihan",
      mode: String(item.mode)
        .replace("timed_30", "30 detik")
        .replace("timed_60", "60 detik")
        .replace("quote", "Kutipan"),
      wpm: Number(item.wpm),
      accuracy: Number(item.accuracy),
      duration: Number(item.duration_ms),
      placement: null as number | null,
      date: String(item.created_at),
      href: `/history/${item.id}`,
    }));
  const raceRows = (races ?? []).map((item) => {
    const room = item.race_rooms as { code?: string; name?: string } | null;
    return {
      id: String(item.id),
      kind: "Race",
      mode: room?.name ?? "Balapan",
      wpm: Number(item.wpm),
      accuracy: Number(item.accuracy),
      duration: Number(item.duration_ms),
      placement: Number(item.placement),
      date: String(item.created_at),
      href: room?.code ? `/race/${room.code}?result=1` : `/history/${item.id}`,
    };
  });
  const rows = [...practiceRows, ...raceRows].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <AccountShell
      profile={{
        username: String(current.username),
        display_name: String(current.display_name),
        avatar_seed: String(current.avatar_seed),
        role: String(current.role),
      }}
    >
      <p className="eyebrow">Catatan sesi</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">Histori.</h1>
      <p className="mt-2 text-muted">
        Semua hasil resmi dan hasil yang perlu diperiksa.
      </p>
      <nav
        className="mt-7 flex gap-2 overflow-x-auto pb-2"
        aria-label="Filter histori"
      >
        {filters.map((item) => (
          <Link
            key={item.value}
            href={`/history?filter=${item.value}`}
            className={`button-base whitespace-nowrap ${filter === item.value ? "border-ink bg-ink text-paper" : "border-line bg-card text-muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <section className="panel mt-5 overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-sand font-mono text-[10px] uppercase tracking-[.12em] text-muted">
                <tr>
                  <th className="px-5 py-4">Tanggal</th>
                  <th className="px-5 py-4">Mode</th>
                  <th className="px-5 py-4">WPM</th>
                  <th className="px-5 py-4">Akurasi</th>
                  <th className="px-5 py-4">Posisi</th>
                  <th className="px-5 py-4">Durasi</th>
                  <th className="px-5 py-4">
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.kind}-${row.id}`}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-5 py-4 text-muted">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-5 py-4">
                      <strong>{row.kind}</strong>
                      <span className="mt-1 block text-xs text-muted">
                        {row.mode}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {Math.round(row.wpm)}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {formatNumber(row.accuracy)}%
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {row.placement ? `#${row.placement}` : "—"}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {formatDuration(row.duration)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={row.href}
                        className="font-bold text-accent hover:underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="font-bold">Belum ada hasil.</p>
            <p className="mt-2 text-sm text-muted">
              Pilih mode lain atau selesaikan latihan pertamamu.
            </p>
          </div>
        )}
      </section>
    </AccountShell>
  );
}
