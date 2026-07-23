import { CreateRoomForm } from "@/components/race/room-forms";
import { SiteHeader } from "@/components/layout/site-header";
import { ActiveRoomCard } from "@/components/race/active-room-card";
import { normalizeActiveRaceRoom } from "@/lib/race/active-room";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Buat Room" };
export const dynamic = "force-dynamic";
export default async function CreateRacePage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: activeRoomData }] = await Promise.all([
    supabase.from("text_categories").select("id,name").order("name"),
    supabase.rpc("get_active_race_room"),
  ]);
  const categories = (data ?? []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
  }));
  const activeRoom = normalizeActiveRaceRoom(activeRoomData);
  return (
    <>
      <SiteHeader />
      <main className="page-shell max-w-3xl py-12 sm:py-16">
        <p className="eyebrow">Private race / baru</p>
        <h1 className="mt-4 text-5xl font-bold tracking-[-.05em]">
          Buat ruang balapan.
        </h1>
        <p className="mt-4 mb-9 leading-7 text-muted">
          Host dapat mengubah pengaturan selama room masih menunggu.
        </p>
        {activeRoom ? (
          <>
            <p className="panel border-accent/40 p-5 leading-7 text-muted">
              Kamu sudah memiliki room aktif. Buka room itu kembali, atau
              batalkan/keluar sebelum membuat room baru.
            </p>
            <ActiveRoomCard room={activeRoom} />
          </>
        ) : (
          <CreateRoomForm categories={categories} />
        )}
      </main>
    </>
  );
}
