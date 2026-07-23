import { CategoryManager } from "@/components/admin/category-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin Kategori" };
export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("text_categories")
    .select("id,name,slug,description")
    .order("name");
  const categories = (data ?? []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
    slug: String(item.slug),
    description: item.description ? String(item.description) : null,
  }));
  return (
    <>
      <p className="eyebrow">Konten / kategori</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">
        Kategori teks.
      </h1>
      <p className="mt-2 mb-8 text-muted">
        Kategori hanya dapat dihapus jika belum digunakan.
      </p>
      <CategoryManager categories={categories} />
    </>
  );
}
