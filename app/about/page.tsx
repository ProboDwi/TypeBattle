import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata = { title: "Tentang" };

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell min-h-[70vh] py-20">
        <p className="eyebrow">Tentang Keylane</p>
        <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-[-.05em]">
          Latihan yang jujur, balapan yang seru.
        </h1>
        <div className="mt-10 max-w-2xl space-y-5 text-lg leading-8 text-muted">
          <p>
            Keylane dibuat untuk pengetik Bahasa Indonesia yang ingin mengukur
            ritme, akurasi, dan perkembangan tanpa statistik rekaan.
          </p>
          <p>
            Hasil resmi dihitung ulang di server. Mode multiplayer memakai
            Supabase Realtime untuk menyinkronkan pemain, sementara database
            tetap menjadi sumber kebenaran.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
