import { JoinRoomForm } from "@/components/race/room-forms";
import { SiteHeader } from "@/components/layout/site-header";
import { requireUser } from "@/lib/supabase/auth";

export const metadata = { title: "Gabung Room" };
export const dynamic = "force-dynamic";
export default async function JoinRacePage({
  searchParams,
}: PageProps<"/race/join">) {
  await requireUser();
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  return (
    <>
      <SiteHeader />
      <main className="page-shell max-w-xl py-12 sm:py-16">
        <p className="eyebrow">Invitation lane</p>
        <h1 className="mt-4 text-5xl font-bold tracking-[-.05em]">
          Masukkan kode.
        </h1>
        <p className="mt-4 mb-9 leading-7 text-muted">
          Kode room terdiri dari enam huruf kapital dan angka yang mudah
          dibedakan.
        </p>
        <JoinRoomForm initialCode={code} />
      </main>
    </>
  );
}
