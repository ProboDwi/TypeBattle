"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell grid min-h-screen place-items-center py-20 text-center">
      <div>
        <p className="eyebrow justify-center">Gangguan lintasan</p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight">
          Halaman gagal dimuat.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Koneksi mungkin terputus sesaat. Coba muat ulang bagian ini.
        </p>
        <Button onClick={reset} className="mt-8">
          Coba lagi
        </Button>
      </div>
    </main>
  );
}
