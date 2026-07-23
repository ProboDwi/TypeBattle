import { notFound } from "next/navigation";
import { Award, Flag, Gauge, Keyboard, Trophy } from "lucide-react";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Avatar } from "@/components/ui/avatar";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils/format";

export async function generateMetadata({
  params,
}: PageProps<"/profile/[username]">) {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `Profil publik @${username} di Keylane.`,
  };
}

export default async function PublicProfilePage({
  params,
}: PageProps<"/profile/[username]">) {
  if (!hasSupabaseEnv()) notFound();
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();
  const [{ data: achievements }, { data: performance }] = await Promise.all([
    supabase
      .from("user_achievements")
      .select("obtained_at,achievements(name,description,icon_name)")
      .eq("user_id", profile.id)
      .order("obtained_at", { ascending: false }),
    supabase
      .from("public_performance")
      .select("id,kind,wpm,accuracy,created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(16),
  ]);
  const stats = [
    ["Best WPM", formatNumber(Number(profile.best_wpm)), Gauge],
    [
      "Akurasi rata-rata",
      `${formatNumber(Number(profile.average_accuracy))}%`,
      Keyboard,
    ],
    ["Total race", formatNumber(Number(profile.total_races)), Flag],
    ["Kemenangan", formatNumber(Number(profile.total_wins)), Trophy],
  ] as const;
  return (
    <>
      <SiteHeader />
      <main className="page-shell min-h-[75vh] py-10 sm:py-14">
        <section className="panel overflow-hidden">
          <div className="h-3 bg-accent" />
          <div className="grid gap-7 p-6 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <Avatar
              seed={String(profile.avatar_seed)}
              label={String(profile.display_name)}
              className="size-24"
            />
            <div>
              <p className="font-mono text-xs uppercase tracking-[.13em] text-muted">
                Player profile / Level {profile.level}
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-[-.045em]">
                {profile.display_name}
              </h1>
              <p className="mt-1 font-mono text-sm text-accent">
                @{profile.username}
              </p>
              <p className="mt-5 max-w-2xl leading-7 text-muted">
                {profile.bio || "Pemain ini belum menulis bio."}
              </p>
            </div>
            <div className="border-l border-line pl-6">
              <p className="font-mono text-[10px] uppercase tracking-[.12em] text-muted">
                Rating
              </p>
              <p className="mt-2 font-mono text-4xl font-bold">
                {profile.rating}
              </p>
              <p className="mt-2 text-xs text-muted">
                Bergabung {formatDate(String(profile.created_at))}
              </p>
            </div>
          </div>
        </section>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value, Icon]) => (
            <div key={label} className="panel p-5">
              <Icon size={17} className="text-accent" />
              <p className="mt-6 font-mono text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Performa publik</h2>
              <span className="font-mono text-xs text-muted">
                WPM / 16 hasil
              </span>
            </div>
            <TrendChart
              label="Performa WPM publik"
              values={[...(performance ?? [])]
                .reverse()
                .map((item) => Number(item.wpm))}
            />
          </section>
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-accent" />
              <h2 className="font-bold">Achievement</h2>
            </div>
            {achievements?.length ? (
              <div className="mt-5 space-y-4">
                {achievements.map((item, index) => {
                  const achievement = item.achievements as {
                    name?: string;
                    description?: string;
                  } | null;
                  return (
                    <div
                      key={`${item.obtained_at}-${index}`}
                      className="border-l-2 border-moss pl-4"
                    >
                      <p className="font-bold">{achievement?.name}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {achievement?.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-muted">
                Belum ada achievement publik.
              </p>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
