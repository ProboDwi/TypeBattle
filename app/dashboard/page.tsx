import {
  ArrowRight,
  CalendarDays,
  Flag,
  Keyboard,
  Swords,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { AccountShell } from "@/components/dashboard/account-shell";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { ButtonLink } from "@/components/ui/button";
import { getLevelProgress } from "@/lib/profile/experience";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await requireUser();
  const supabase = await createClient();
  const [
    profileResult,
    practicesResult,
    racesResult,
    achievementsResult,
    dailyResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", viewer.user.id).single(),
    supabase
      .from("practice_sessions")
      .select("id,mode,wpm,accuracy,created_at")
      .eq("user_id", viewer.user.id)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("race_results")
      .select("id,placement,wpm,accuracy,created_at,race_rooms(code,name)")
      .eq("user_id", viewer.user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("user_achievements")
      .select("obtained_at,achievements(name,description,icon_name)")
      .eq("user_id", viewer.user.id)
      .order("obtained_at", { ascending: false })
      .limit(3),
    supabase
      .from("daily_challenges")
      .select("id,challenge_date,typing_texts(title,difficulty)")
      .eq(
        "challenge_date",
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
      )
      .maybeSingle(),
  ]);
  const profile = profileResult.data ?? viewer.profile;
  const practices = practicesResult.data ?? [];
  const races = racesResult.data ?? [];
  const levelProgress = getLevelProgress(Number(profile.experience ?? 0));
  const activities = [
    ...practices.slice(0, 5).map((item) => ({
      id: String(item.id),
      type: "Latihan",
      detail: String(item.mode).replace("timed_", " detik"),
      wpm: Number(item.wpm),
      accuracy: Number(item.accuracy),
      date: String(item.created_at),
    })),
    ...races.slice(0, 5).map((item) => ({
      id: String(item.id),
      type: "Race",
      detail: `Peringkat ${item.placement}`,
      wpm: Number(item.wpm),
      accuracy: Number(item.accuracy),
      date: String(item.created_at),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const shellProfile = {
    username: String(profile.username),
    display_name: String(profile.display_name),
    avatar_seed: String(profile.avatar_seed),
    role: String(profile.role),
  };
  const stats = [
    ["Best WPM", formatNumber(Number(profile.best_wpm)), Keyboard],
    ["Rata-rata WPM", formatNumber(Number(profile.average_wpm)), Swords],
    ["Akurasi", `${formatNumber(Number(profile.average_accuracy))}%`, Trophy],
    ["Rating", formatNumber(Number(profile.rating)), Flag],
  ] as const;

  return (
    <AccountShell profile={shellProfile}>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Dashboard / Level {profile.level}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
            Halo, {profile.display_name}.
          </h1>
          <p className="mt-2 text-muted">
            Satu sesi bersih lebih berguna daripada sepuluh sesi terburu-buru.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/practice">Lanjut latihan</ButtonLink>
          <ButtonLink href="/race" variant="secondary">
            Quick race
          </ButtonLink>
          <ButtonLink href="/race/create" variant="quiet">
            Buat private room
          </ButtonLink>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted">{label}</p>
              <Icon size={17} className="text-accent" />
            </div>
            <p className="mt-5 font-mono text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <SmallStat
          label="Total latihan"
          value={Number(profile.total_practices)}
        />
        <SmallStat label="Total race" value={Number(profile.total_races)} />
        <SmallStat label="Kemenangan" value={Number(profile.total_wins)} />
      </div>

      <section className="panel mt-3 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Level {levelProgress.level}</p>
            <p className="mt-1 text-xs text-muted">
              {levelProgress.current} / {levelProgress.required} XP menuju level
              berikutnya
            </p>
          </div>
          <span className="font-mono text-sm text-accent">
            {Math.round(levelProgress.percentage)}%
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden bg-sand">
          <div
            className="h-full bg-accent"
            style={{ width: `${levelProgress.percentage}%` }}
          />
        </div>
      </section>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Perkembangan WPM</h2>
            <span className="font-mono text-xs text-muted">12 sesi</span>
          </div>
          <TrendChart
            label="Perkembangan WPM"
            values={[...practices].reverse().map((item) => Number(item.wpm))}
          />
        </section>
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Perkembangan akurasi</h2>
            <span className="font-mono text-xs text-muted">12 sesi</span>
          </div>
          <TrendChart
            label="Perkembangan akurasi"
            values={[...practices]
              .reverse()
              .map((item) => Number(item.accuracy))}
          />
        </section>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h2 className="font-bold">Aktivitas terakhir</h2>
            <Link
              href="/history"
              className="inline-flex items-center gap-1 text-sm font-bold text-accent"
            >
              Semua <ArrowRight size={14} />
            </Link>
          </div>
          {activities.length ? (
            activities.map((activity) => (
              <div
                key={`${activity.type}-${activity.id}`}
                className="grid grid-cols-[1fr_auto] gap-4 border-b border-line px-5 py-4 last:border-b-0"
              >
                <div>
                  <p className="font-bold">
                    {activity.type} · {activity.detail}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(activity.date)}
                  </p>
                </div>
                <p className="font-mono text-sm">
                  {Math.round(activity.wpm)} WPM{" "}
                  <span className="text-muted">
                    / {formatNumber(activity.accuracy)}%
                  </span>
                </p>
              </div>
            ))
          ) : (
            <EmptyState text="Belum ada aktivitas. Mulai satu latihan untuk membuat catatan pertama." />
          )}
        </section>
        <div className="grid gap-3">
          <section className="panel p-5">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-accent" />
              <h2 className="font-bold">Tantangan hari ini</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              {dailyResult.data
                ? `Teks “${(dailyResult.data.typing_texts as { title?: string } | null)?.title ?? "harian"}” sudah siap. Hasil resmi pertama akan dicatat.`
                : "Tantangan dibuat otomatis saat pemain pertama memulainya."}
            </p>
            <Link
              href="/practice?mode=daily"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent"
            >
              Mulai tantangan <ArrowRight size={14} />
            </Link>
          </section>
          <section className="panel p-5">
            <h2 className="font-bold">Achievement terbaru</h2>
            {achievementsResult.data?.length ? (
              <div className="mt-4 space-y-3">
                {achievementsResult.data.map((item, index) => {
                  const achievement = item.achievements as {
                    name?: string;
                    description?: string;
                  } | null;
                  return (
                    <div key={`${item.obtained_at}-${index}`}>
                      <p className="text-sm font-bold">{achievement?.name}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {achievement?.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Achievement pertamamu masih menunggu di lintasan.
              </p>
            )}
          </section>
        </div>
      </div>
    </AccountShell>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel flex items-center justify-between px-5 py-4">
      <span className="text-sm text-muted">{label}</span>
      <strong className="font-mono">{formatNumber(value)}</strong>
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm leading-6 text-muted">{text}</div>
  );
}
