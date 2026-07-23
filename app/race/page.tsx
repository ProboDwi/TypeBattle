import { ArrowRight, LockKeyhole, Radio, Users } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ActiveRoomCard } from "@/components/race/active-room-card";
import { QuickMatchButton } from "@/components/race/room-forms";
import { normalizeActiveRaceRoom } from "@/lib/race/active-room";
import { getViewer } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Balapan" };
export const dynamic = "force-dynamic";
export default async function RacePage() {
  const viewer = await getViewer();
  let activeRoom = null;
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_active_race_room");
    activeRoom = normalizeActiveRaceRoom(data);
  }
  return (
    <>
      <SiteHeader />
      <main className="page-shell min-h-[75vh] py-12 sm:py-16">
        <p className="eyebrow">Multiplayer lane</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-[-.06em] sm:text-6xl">
          Masuk lintasan. Jaga akurasi.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
          Balapan menggunakan satu teks dan timestamp mulai yang sama. Progress
          bergerak realtime; hasil resmi dihitung ulang di server.
        </p>
        {activeRoom && <ActiveRoomCard room={activeRoom} />}
        <div className="mt-12 grid gap-3 lg:grid-cols-3">
          <RaceCard
            icon={Radio}
            title="Quick race"
            description="Temukan hingga tiga pemain lain dengan rentang rating yang semakin lebar saat menunggu."
          >
            {viewer ? (
              <QuickMatchButton />
            ) : (
              <Link
                href="/auth/sign-in?next=/race"
                className="button-base w-full border-accent bg-accent text-white"
              >
                Masuk untuk mencari lawan
              </Link>
            )}
          </RaceCard>
          <RaceCard
            icon={Users}
            title="Buat private room"
            description="Atur kapasitas, kategori, dan kesulitan. Bagikan kode enam karakter kepada teman."
          >
            <Link
              href="/race/create"
              className="button-base w-full border-ink bg-transparent text-ink"
            >
              Buat room <ArrowRight size={16} />
            </Link>
          </RaceCard>
          <RaceCard
            icon={LockKeyhole}
            title="Gabung dengan kode"
            description="Masukkan kode undangan. Sistem akan memeriksa kapasitas dan status room sebelum bergabung."
          >
            <Link
              href="/race/join"
              className="button-base w-full border-line bg-card text-ink"
            >
              Masukkan kode <ArrowRight size={16} />
            </Link>
          </RaceCard>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
function RaceCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Radio;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel flex min-h-80 flex-col p-6">
      <Icon size={22} className="text-accent" />
      <h2 className="mt-12 text-2xl font-bold">{title}</h2>
      <p className="mt-3 flex-1 leading-7 text-muted">{description}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}
