import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="page-shell grid min-h-screen place-items-center py-20 text-center">
      <div>
        <p className="eyebrow justify-center">404 / keluar jalur</p>
        <h1 className="mt-5 text-5xl font-bold tracking-tight">
          Halaman tidak ditemukan.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Tautan ini mungkin sudah berpindah atau tidak pernah berada di
          lintasan.
        </p>
        <ButtonLink href="/" className="mt-8">
          Kembali ke beranda
        </ButtonLink>
      </div>
    </main>
  );
}
