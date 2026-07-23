import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[.82fr_1.18fr]">
      <section className="flex items-center bg-paper px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="wordmark">
            KEY<span>LANE</span>
          </Link>
          <p className="eyebrow mt-14">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-.045em]">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-muted">{description}</p>
          <div className="mt-9">{children}</div>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-ink p-14 text-paper lg:flex lg:flex-col lg:justify-between">
        <p className="font-mono text-xs tracking-[.18em] text-white/40">
          KEYLANE ACCESS / SECURE LANE
        </p>
        <div className="space-y-8">
          {[72, 54, 36].map((progress, index) => (
            <div
              key={progress}
              className="grid grid-cols-[28px_1fr_48px] items-center gap-4 font-mono text-xs text-white/55"
            >
              <span>0{index + 1}</span>
              <div className="relative h-5 border-y border-dashed border-white/15">
                <span
                  className="race-marker bg-flare"
                  style={{ transform: `translateX(calc(${progress}% - 8px))` }}
                />
              </div>
              <span>{progress}%</span>
            </div>
          ))}
        </div>
        <blockquote className="max-w-lg text-4xl font-bold leading-tight tracking-[-.045em]">
          “Kecepatan datang setelah akurasi menemukan ritmenya.”
        </blockquote>
      </aside>
    </main>
  );
}
