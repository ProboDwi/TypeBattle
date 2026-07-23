import { notFound } from "next/navigation";
import { TextForm } from "@/components/admin/text-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit Teks" };
export default async function EditTextPage({
  params,
}: PageProps<"/admin/texts/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: text }, { data: categories }] = await Promise.all([
    supabase
      .from("typing_texts")
      .select("id,title,content,category_id,difficulty,status,source_label")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("text_categories").select("id,name").order("name"),
  ]);
  if (!text) notFound();
  return (
    <>
      <p className="eyebrow">Konten / edit</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">Edit teks.</h1>
      <p className="mt-2 mb-8 text-muted">
        Perubahan jumlah karakter dan kata dihitung ulang oleh trigger database.
      </p>
      <TextForm
        categories={(categories ?? []).map((item) => ({
          id: String(item.id),
          name: String(item.name),
        }))}
        initial={{
          id: String(text.id),
          title: String(text.title),
          content: String(text.content),
          categoryId: String(text.category_id),
          difficulty: String(text.difficulty),
          status: String(text.status),
          sourceLabel: String(text.source_label ?? ""),
        }}
      />
    </>
  );
}
