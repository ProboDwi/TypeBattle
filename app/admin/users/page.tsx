import { RoleControl } from "@/components/admin/admin-actions";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Admin Pengguna" };
export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(
      "id,username,display_name,role,rating,best_wpm,total_practices,total_races,total_wins,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  const { data } = await query;
  return (
    <>
      <p className="eyebrow">Akses / pengguna</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">Pengguna.</h1>
      <form className="mt-7 flex max-w-xl gap-2">
        <input
          name="q"
          className="field"
          defaultValue={q}
          placeholder="Cari username atau nama…"
        />
        <button className="button-base border-ink bg-ink text-paper">
          Cari
        </button>
      </form>
      <section className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-sand font-mono text-[10px] uppercase tracking-[.12em] text-muted">
            <tr>
              <th className="p-4">Pengguna</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Best</th>
              <th className="p-4">Latihan</th>
              <th className="p-4">Race / menang</th>
              <th className="p-4">Bergabung</th>
              <th className="p-4">Role</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0">
                <td className="p-4">
                  <strong>{user.display_name}</strong>
                  <span className="mt-1 block font-mono text-xs text-muted">
                    @{user.username}
                  </span>
                </td>
                <td className="p-4 font-mono">
                  {formatNumber(Number(user.rating))}
                </td>
                <td className="p-4 font-mono">
                  {formatNumber(Number(user.best_wpm))}
                </td>
                <td className="p-4 font-mono">{user.total_practices}</td>
                <td className="p-4 font-mono">
                  {user.total_races} / {user.total_wins}
                </td>
                <td className="p-4 text-xs text-muted">
                  {formatDate(String(user.created_at))}
                </td>
                <td className="p-4">
                  <RoleControl
                    userId={String(user.id)}
                    role={String(user.role)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
