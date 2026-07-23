import {
  Activity,
  BookOpenText,
  Flag,
  Keyboard,
  ShieldAlert,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils/format";
import { getIsoHoursAgo } from "@/data/admin";

export const metadata = { title: "Admin" };
export default async function AdminPage() {
  const supabase = await createClient();
  const activeSince = getIsoHoursAgo(24);
  const [
    users,
    activeUsers,
    practices,
    races,
    texts,
    suspiciousPractice,
    suspiciousRace,
    activeRaces,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_played_at", activeSince),
    supabase
      .from("practice_sessions")
      .select("id", { count: "exact", head: true }),
    supabase.from("race_rooms").select("id", { count: "exact", head: true }),
    supabase.from("typing_texts").select("id", { count: "exact", head: true }),
    supabase
      .from("practice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("suspicious", true),
    supabase
      .from("race_results")
      .select("id", { count: "exact", head: true })
      .eq("suspicious", true),
    supabase
      .from("race_rooms")
      .select("id", { count: "exact", head: true })
      .in("status", ["waiting", "countdown", "racing"]),
  ]);
  const cards = [
    ["Pengguna", users.count, Users],
    ["Aktif 24 jam", activeUsers.count, Activity],
    ["Latihan", practices.count, Keyboard],
    ["Total race", races.count, Flag],
    ["Teks", texts.count, BookOpenText],
    [
      "Hasil mencurigakan",
      (suspiciousPractice.count ?? 0) + (suspiciousRace.count ?? 0),
      ShieldAlert,
    ],
    ["Race aktif", activeRaces.count, Flag],
  ] as const;
  return (
    <>
      <p className="eyebrow">Race control</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
        Ringkasan sistem.
      </h1>
      <p className="mt-2 text-muted">
        Angka berasal langsung dari database dan berubah mengikuti aktivitas.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <section key={label} className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted">{label}</p>
              <Icon size={17} className="text-accent" />
            </div>
            <p className="mt-6 font-mono text-3xl font-bold">
              {formatNumber(value ?? 0)}
            </p>
          </section>
        ))}
      </div>
      <section className="panel mt-3 p-6">
        <h2 className="font-bold">Status operasional</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Status label="Autentikasi" detail="Supabase Auth + cookie SSR" />
          <Status label="Realtime" detail="Private channel + RLS" />
          <Status label="Finalisasi" detail="PostgreSQL transaction" />
        </div>
      </section>
    </>
  );
}
function Status({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-[7px] border border-line bg-paper p-4">
      <span className="inline-flex items-center gap-2 text-sm font-bold">
        <span className="size-2 bg-moss" />
        {label}
      </span>
      <p className="mt-2 font-mono text-xs text-muted">{detail}</p>
    </div>
  );
}
