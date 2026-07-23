import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Admin Teks" };
export default async function AdminTextsPage({
  searchParams,
}: PageProps<"/admin/texts">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const difficulty =
    typeof params.difficulty === "string" ? params.difficulty : "";
  const category = typeof params.category === "string" ? params.category : "";
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("typing_texts")
    .select(
      "id,title,difficulty,status,character_count,word_count,created_at,text_categories(id,name)",
      { count: "exact" },
    );
  if (search) query = query.ilike("title", `%${search}%`);
  if (["easy", "medium", "hard"].includes(difficulty))
    query = query.eq("difficulty", difficulty);
  if (category) query = query.eq("category_id", category);
  const [{ data, count }, { data: categories }] = await Promise.all([
    query
      .order("created_at", { ascending: false })
      .range((page - 1) * 20, page * 20 - 1),
    supabase.from("text_categories").select("id,name").order("name"),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Konten / teks</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
            Teks latihan.
          </h1>
        </div>
        <Link
          href="/admin/texts/new"
          className="button-base border-accent bg-accent text-white"
        >
          Tambah teks
        </Link>
      </div>
      <form className="panel mt-7 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          name="q"
          className="field"
          defaultValue={search}
          placeholder="Cari judul…"
        />
        <select name="difficulty" className="field" defaultValue={difficulty}>
          <option value="">Semua tingkat</option>
          <option value="easy">Mudah</option>
          <option value="medium">Menengah</option>
          <option value="hard">Sulit</option>
        </select>
        <select name="category" className="field" defaultValue={category}>
          <option value="">Semua kategori</option>
          {categories?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="button-base border-ink bg-ink text-paper">
          Filter
        </button>
      </form>
      <section className="panel mt-3 overflow-hidden">
        {data?.length ? (
          data.map((item) => {
            const relation = item.text_categories as { name?: string } | null;
            return (
              <div
                key={item.id}
                className="grid gap-4 border-b border-line p-5 last:border-0 sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <Link
                    href={`/admin/texts/${item.id}/edit`}
                    className="font-bold hover:text-accent"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {relation?.name} · {item.difficulty} ·{" "}
                    {item.character_count} karakter · {item.word_count} kata
                  </p>
                </div>
                <span className="h-fit rounded-[5px] border border-line px-2 py-1 font-mono text-[10px] uppercase">
                  {item.status}
                </span>
                <span className="text-xs text-muted">
                  {formatDate(String(item.created_at))}
                </span>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-muted">
            Tidak ada teks untuk filter ini.
          </div>
        )}
      </section>
      <div className="mt-5 flex items-center justify-between text-sm text-muted">
        <span>{count ?? 0} teks</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              className="button-base border-line bg-card"
              href={`/admin/texts?page=${page - 1}`}
            >
              Sebelumnya
            </Link>
          )}
          {(count ?? 0) > page * 20 && (
            <Link
              className="button-base border-line bg-card"
              href={`/admin/texts?page=${page + 1}`}
            >
              Berikutnya
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
