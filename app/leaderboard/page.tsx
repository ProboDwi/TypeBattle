import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getViewer } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { formatDate, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Peringkat" };
const tabs = [
  { value: "wpm", label: "WPM tertinggi" },
  { value: "rating", label: "Rating" },
  { value: "wins", label: "Total kemenangan" },
  { value: "daily", label: "Tantangan harian" },
];
const periods = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "Minggu ini" },
  { value: "all", label: "Sepanjang waktu" },
];
type BoardRow = {
  userId: string;
  username: string;
  displayName: string;
  value: number;
  accuracy?: number;
  date?: string;
};

function sinceFor(period: string) {
  const now = new Date();
  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (period === "week") {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  return null;
}

export default async function LeaderboardPage({
  searchParams,
}: PageProps<"/leaderboard">) {
  const params = await searchParams;
  const tab = tabs.some((item) => item.value === params.tab)
    ? String(params.tab)
    : "wpm";
  const period = periods.some((item) => item.value === params.period)
    ? String(params.period)
    : "all";
  let rows: BoardRow[] = [];
  let viewerId: string | null = null;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const viewer = await getViewer();
    viewerId = viewer?.user.id ?? null;
    const since = sinceFor(period);
    if (tab === "wpm") {
      let query = supabase
        .from("leaderboard_wpm_entries")
        .select("user_id,username,display_name,wpm,accuracy,finished_at")
        .order("wpm", { ascending: false })
        .limit(100);
      if (since) query = query.gte("finished_at", since);
      const { data } = await query;
      const seen = new Set<string>();
      rows = (data ?? [])
        .filter((item) => {
          if (seen.has(String(item.user_id))) return false;
          seen.add(String(item.user_id));
          return true;
        })
        .map((item) => ({
          userId: String(item.user_id),
          username: String(item.username),
          displayName: String(item.display_name),
          value: Number(item.wpm),
          accuracy: Number(item.accuracy),
          date: String(item.finished_at),
        }));
    } else if (tab === "daily") {
      let query = supabase
        .from("leaderboard_daily")
        .select(
          "user_id,username,display_name,wpm,accuracy,created_at,challenge_date",
        )
        .order("wpm", { ascending: false })
        .limit(100);
      if (since) query = query.gte("created_at", since);
      const { data } = await query;
      rows = (data ?? []).map((item) => ({
        userId: String(item.user_id),
        username: String(item.username),
        displayName: String(item.display_name),
        value: Number(item.wpm),
        accuracy: Number(item.accuracy),
        date: String(item.created_at),
      }));
    } else {
      const orderColumn = tab === "rating" ? "rating" : "total_wins";
      const { data } = await supabase
        .from("leaderboard_rating")
        .select("user_id,username,display_name,rating,total_wins")
        .order(orderColumn, { ascending: false })
        .limit(100);
      rows = (data ?? []).map((item) => ({
        userId: String(item.user_id),
        username: String(item.username),
        displayName: String(item.display_name),
        value: Number(tab === "rating" ? item.rating : item.total_wins),
      }));
    }
  }
  const viewerRank = viewerId
    ? rows.findIndex((row) => row.userId === viewerId) + 1
    : 0;
  return (
    <>
      <SiteHeader />
      <main className="page-shell min-h-[75vh] py-12">
        <p className="eyebrow">Leaderboard</p>
        <h1 className="mt-4 text-5xl font-bold tracking-[-.055em]">
          Papan peringkat.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          Hasil suspicious, latihan tamu, dan sesi dengan akurasi di bawah 90%
          tidak dihitung pada papan WPM.
        </p>
        <nav
          className="mt-9 flex gap-2 overflow-x-auto pb-2"
          aria-label="Jenis peringkat"
        >
          {tabs.map((item) => (
            <Link
              key={item.value}
              href={`/leaderboard?tab=${item.value}&period=${period}`}
              aria-current={tab === item.value ? "page" : undefined}
              className={`button-base whitespace-nowrap ${tab === item.value ? "border-ink bg-ink text-paper" : "border-line bg-card text-muted"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <nav
          className="mt-3 flex gap-5 border-b border-line"
          aria-label="Periode peringkat"
        >
          {periods.map((item) => (
            <Link
              key={item.value}
              href={`/leaderboard?tab=${tab}&period=${item.value}`}
              aria-current={period === item.value ? "page" : undefined}
              className={`border-b-2 px-1 py-3 text-sm font-bold ${period === item.value ? "border-accent text-ink" : "border-transparent text-muted"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {viewerRank > 10 && (
          <p className="mt-5 rounded-[7px] border border-accent/30 bg-accent/5 p-4 text-sm">
            Posisimu saat ini <strong>#{viewerRank}</strong> dengan nilai{" "}
            <strong>{formatNumber(rows[viewerRank - 1].value)}</strong>.
          </p>
        )}
        <section className="panel mt-5 overflow-hidden">
          {rows.length ? (
            rows.slice(0, 20).map((row, index) => (
              <div
                key={`${row.userId}-${index}`}
                className={`grid grid-cols-[38px_1fr_auto] items-center gap-4 border-b border-line px-5 py-4 last:border-0 ${row.userId === viewerId ? "bg-accent/5" : ""}`}
              >
                <span className="font-mono text-sm text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <Link
                    href={`/profile/${row.username}`}
                    className="font-bold hover:text-accent"
                  >
                    {row.displayName}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-muted">
                    @{row.username}
                    {row.accuracy !== undefined
                      ? ` · ${formatNumber(row.accuracy)}%`
                      : ""}
                    {row.date ? ` · ${formatDate(row.date)}` : ""}
                  </p>
                </div>
                <p className="font-mono text-xl text-accent">
                  {tab === "wins"
                    ? Math.round(row.value)
                    : formatNumber(row.value)}{" "}
                  <span className="text-[10px] uppercase text-muted">
                    {tab === "wpm" || tab === "daily" ? "WPM" : tab}
                  </span>
                </p>
              </div>
            ))
          ) : (
            <div className="p-14 text-center">
              <p className="font-bold">Belum ada hasil untuk filter ini.</p>
              <p className="mt-2 text-sm text-muted">
                Selesaikan sesi resmi untuk membuka papan peringkat.
              </p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
