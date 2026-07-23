import { notFound } from "next/navigation";
import { AccountShell } from "@/components/dashboard/account-shell";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration, formatNumber } from "@/lib/utils/format";

export default async function HistoryDetailPage({
  params,
}: PageProps<"/history/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: profile }, { data: session }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,avatar_seed,role")
      .eq("id", viewer.user.id)
      .single(),
    supabase
      .from("practice_sessions")
      .select(
        "id,mode,status,wpm,accuracy,duration_ms,incorrect_keystrokes,total_keystrokes,suspicious,suspicious_reason,created_at,typing_texts(title,difficulty,text_categories(name))",
      )
      .eq("id", id)
      .eq("user_id", viewer.user.id)
      .maybeSingle(),
  ]);
  if (!session) notFound();
  const current = profile ?? viewer.profile;
  const text = session.typing_texts as {
    title?: string;
    difficulty?: string;
    text_categories?: { name?: string };
  } | null;
  return (
    <AccountShell
      profile={{
        username: String(current.username),
        display_name: String(current.display_name),
        avatar_seed: String(current.avatar_seed),
        role: String(current.role),
      }}
    >
      <p className="eyebrow">Detail latihan</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
        {text?.title ?? "Sesi latihan"}
      </h1>
      <p className="mt-2 text-muted">
        {formatDate(String(session.created_at))} ·{" "}
        {text?.text_categories?.name ?? "Umum"} · {text?.difficulty ?? "—"}
      </p>
      <section className="panel mt-8 grid gap-px overflow-hidden bg-line sm:grid-cols-4">
        {[
          ["WPM", Math.round(Number(session.wpm))],
          ["Akurasi", `${formatNumber(Number(session.accuracy))}%`],
          ["Durasi", formatDuration(Number(session.duration_ms))],
          ["Kesalahan", Number(session.incorrect_keystrokes)],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-[.12em] text-muted">
              {label}
            </p>
            <p className="mt-3 font-mono text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>
      {session.suspicious && (
        <p className="mt-4 rounded-[7px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Hasil ini ditandai untuk pemeriksaan:{" "}
          {session.suspicious_reason || "pola input tidak wajar"}.
        </p>
      )}
      <div className="mt-7 flex gap-3">
        <ButtonLink href="/practice">Latihan lagi</ButtonLink>
        <ButtonLink href="/history" variant="secondary">
          Kembali ke histori
        </ButtonLink>
      </div>
    </AccountShell>
  );
}
