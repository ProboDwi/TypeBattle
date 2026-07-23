import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Admin Race" };
export default async function AdminRacesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("race_rooms")
    .select(
      "id,code,name,status,visibility,max_players,starts_at,created_at,profiles!race_rooms_host_id_fkey(username),race_participants(count)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <p className="eyebrow">Operasi / race</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
        Room balapan.
      </h1>
      <p className="mt-2 mb-7 text-muted">Status room terbaru dari database.</p>
      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-sand font-mono text-[10px] uppercase tracking-[.12em] text-muted">
            <tr>
              <th className="p-4">Kode / nama</th>
              <th className="p-4">Host</th>
              <th className="p-4">Akses</th>
              <th className="p-4">Status</th>
              <th className="p-4">Kapasitas</th>
              <th className="p-4">Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((room) => {
              const host = room.profiles as { username?: string } | null;
              const participantRelation = room.race_participants as
                { count?: number }[] | null;
              return (
                <tr
                  key={room.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="p-4">
                    <strong>{room.name}</strong>
                    <span className="mt-1 block font-mono text-xs text-accent">
                      {room.code}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs">@{host?.username}</td>
                  <td className="p-4">{room.visibility}</td>
                  <td className="p-4">
                    <span className="rounded-[5px] border border-line px-2 py-1 font-mono text-[10px] uppercase">
                      {room.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono">
                    {participantRelation?.[0]?.count ?? 0}/{room.max_players}
                  </td>
                  <td className="p-4 text-xs text-muted">
                    {formatDate(String(room.created_at))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
