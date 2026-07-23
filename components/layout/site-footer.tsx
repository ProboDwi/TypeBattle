import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-sand">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="wordmark mb-3">
            KEY<span>LANE</span>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">
            Arena latihan mengetik berbahasa Indonesia untuk membangun ritme,
            akurasi, dan kecepatan.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          <Link className="nav-link" href="/about">
            Tentang
          </Link>
          <Link className="nav-link" href="/leaderboard">
            Peringkat
          </Link>
          <Link className="nav-link" href="/privacy">
            Kebijakan privasi
          </Link>
        </div>
        <p className="border-t border-line pt-5 text-xs uppercase tracking-[0.14em] text-muted md:col-span-2">
          © {new Date().getFullYear()} Keylane. Dibuat untuk papan ketik
          Indonesia.
        </p>
      </div>
    </footer>
  );
}
