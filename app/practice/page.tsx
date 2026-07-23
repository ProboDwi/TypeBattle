import { PracticeGame } from "@/components/game/practice-game";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Latihan Mengetik" };

async function getCategories() {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("text_categories")
      .select("id,name")
      .order("name");
    return (data ?? []).map((category) => ({
      id: String(category.id),
      name: String(category.name),
    }));
  } catch {
    return [];
  }
}

export default async function PracticePage({
  searchParams,
}: PageProps<"/practice">) {
  const categories = await getCategories();
  const params = await searchParams;
  const requestedMode = typeof params.mode === "string" ? params.mode : "quote";
  const initialMode = (
    ["quote", "timed_30", "timed_60", "daily"] as const
  ).includes(requestedMode as "quote" | "timed_30" | "timed_60" | "daily")
    ? (requestedMode as "quote" | "timed_30" | "timed_60" | "daily")
    : "quote";
  return (
    <>
      <SiteHeader />
      <main className="page-shell min-h-[80vh] py-10 sm:py-14">
        <div className="mb-9 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">Practice lane</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-.05em] sm:text-5xl">
              Bangun ritme yang bersih.
            </h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">
            Mode strict aktif: karakter salah tidak akan memajukan posisi. Hapus
            kesalahan, lalu lanjutkan.
          </p>
        </div>
        <PracticeGame categories={categories} initialMode={initialMode} />
      </main>
      <SiteFooter />
    </>
  );
}
