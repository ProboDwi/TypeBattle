import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell min-h-[70vh] py-20">
        <p className="eyebrow">Privasi</p>
        <h1 className="mt-5 text-5xl font-bold tracking-[-.05em]">
          Data seperlunya.
        </h1>
        <div className="mt-10 max-w-2xl space-y-5 leading-7 text-muted">
          <p>
            Keylane menyimpan alamat email melalui Supabase Auth, profil publik,
            preferensi, serta hasil permainan yang diperlukan untuk statistik
            dan peringkat. Email tidak ditampilkan pada profil atau leaderboard.
          </p>
          <p>
            Event permainan dapat dianalisis untuk mendeteksi hasil tidak wajar.
            Rahasia autentikasi dan kunci server tidak dikirim ke browser.
          </p>
          <p>
            Untuk instalasi mandiri, pengelola deployment bertanggung jawab
            menetapkan masa retensi, kontak privasi, dan proses penghapusan akun
            sesuai kewajiban hukum yang berlaku.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
