import { TextForm } from "@/components/admin/text-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Teks Baru" };
export default async function NewTextPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("text_categories")
    .select("id,name")
    .order("name");
  return (
    <>
      <p className="eyebrow">Konten / teks baru</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
        Tambahkan teks.
      </h1>
      <p className="mt-2 mb-8 text-muted">
        Gunakan teks original sepanjang 120–450 karakter.
      </p>
      <TextForm
        categories={(data ?? []).map((item) => ({
          id: String(item.id),
          name: String(item.name),
        }))}
      />
    </>
  );
}
