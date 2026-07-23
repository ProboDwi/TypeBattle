import Link from "next/link";
import { ArrowRight, Clock3, Flag, Keyboard, Users } from "lucide-react";
import { RaceDemo } from "@/components/landing/race-demo";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ButtonLink } from "@/components/ui/button";
import { getLandingLeaderboard } from "@/data/public";
import { formatNumber } from "@/lib/utils/format";

const modes = [
  {
    icon: Keyboard,
    code: "01",
    title: "Latihan bebas",
    description:
      "Pilih kategori, tingkat kesulitan, dan tempo yang ingin kamu asah.",
    href: "/practice",
  },
  {
    icon: Users,
    code: "02",
    title: "Private race",
    description:
      "Buat ruang, bagikan kode enam karakter, lalu adu ritme bersama teman.",
    href: "/race/create",
  },
  {
    icon: Flag,
    code: "03",
    title: "Quick race",
    description:
      "Masuk antrean dan temukan lawan dengan rating yang berdekatan.",
    href: "/race",
  },
  {
    icon: Clock3,
    code: "04",
    title: "Tantangan harian",
    description:
      "Satu teks baru setiap hari, satu hasil resmi untuk papan peringkat.",
    href: "/practice?mode=daily",
  },
];

export default async function Home() {
  const leaderboard = await getLandingLeaderboard();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line">
          <div className="page-shell grid min-h-[calc(100svh-72px)] items-center gap-14 py-16 lg:grid-cols-[1.03fr_.97fr] lg:py-20">
            <div>
              <div className="eyebrow mb-7">
                <span>KL / 01</span> Arena mengetik Indonesia
              </div>
              <h1 className="display-title max-w-3xl">
                Ngetik cepat.
                <br />
                <span>Jangan banyak salah.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
                Latihan sendiri, adu kecepatan dengan teman, dan lihat seberapa
                jauh kemampuan jarimu berkembang.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/practice">
                  Mulai latihan <ArrowRight size={17} aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/race/create" variant="secondary">
                  Buat ruang balapan
                </ButtonLink>
              </div>
              <p className="mt-8 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                <span className="block size-2 bg-moss" /> Tamu bisa langsung
                latihan tanpa akun
              </p>
            </div>
            <RaceDemo />
          </div>
        </section>

        <section className="border-b border-line bg-sand py-20" id="cara-main">
          <div className="page-shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">KL / 02</p>
                <h2>Tiga langkah. Satu garis finis.</h2>
              </div>
              <p>
                Kecepatan penting, tetapi ritme yang bersih membuat hasilmu
                bertahan.
              </p>
            </div>
            <ol className="mt-12 grid border-l border-t border-line md:grid-cols-3">
              {[
                "Pilih teks.",
                "Ketik seakurat mungkin.",
                "Bandingkan hasilmu.",
              ].map((step, index) => (
                <li
                  key={step}
                  className="min-h-44 border-b border-r border-line bg-paper p-6"
                >
                  <span className="font-mono text-xs text-accent">
                    0{index + 1}
                  </span>
                  <h3 className="mt-10 text-xl font-bold">{step}</h3>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-line py-20">
          <div className="page-shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">KL / 03</p>
                <h2>Pilih jalurmu.</h2>
              </div>
              <p>
                Mulai santai, kejar rekor pribadi, atau masuk ke lintasan
                bersama pemain lain.
              </p>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden border border-line bg-line md:grid-cols-2">
              {modes.map(({ icon: Icon, code, title, description, href }) => (
                <Link
                  href={href}
                  key={title}
                  className="group bg-card p-6 transition-colors hover:bg-white"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-[7px] border border-line">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-muted">{code}</span>
                  </div>
                  <h3 className="mt-10 text-2xl font-bold">{title}</h3>
                  <p className="mt-3 max-w-md leading-7 text-muted">
                    {description}
                  </p>
                  <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-accent">
                    Masuk lintasan{" "}
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-paper">
          <div className="page-shell">
            <div className="section-heading dark-section">
              <div>
                <p className="eyebrow text-flare">KL / 04</p>
                <h2>Papan tercepat.</h2>
              </div>
              <p>
                Hanya hasil selesai dengan akurasi minimal 90% dan lolos
                pemeriksaan kewajaran.
              </p>
            </div>
            <div className="mt-12 border-y border-white/15">
              {leaderboard.length ? (
                leaderboard.map((entry) => (
                  <div
                    key={entry.userId}
                    className="grid grid-cols-[38px_1fr_auto] items-center gap-4 border-b border-white/10 py-5 last:border-b-0"
                  >
                    <span className="font-mono text-sm text-white/40">
                      {String(entry.rank).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-bold">{entry.displayName}</p>
                      <p className="mt-1 font-mono text-xs text-white/45">
                        @{entry.username} · {formatNumber(entry.accuracy)}%
                        akurasi
                      </p>
                    </div>
                    <p className="font-mono text-xl text-flare">
                      {Math.round(entry.value)}{" "}
                      <span className="text-xs text-white/50">WPM</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-14 text-center">
                  <p className="font-mono text-sm uppercase tracking-[0.14em] text-white/40">
                    Belum ada catatan resmi
                  </p>
                  <p className="mx-auto mt-3 max-w-md text-white/65">
                    Jadilah pembalap pertama setelah database Supabase
                    terhubung.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-8 text-right">
              <Link
                className="inline-flex items-center gap-2 text-sm font-bold text-flare"
                href="/leaderboard"
              >
                Lihat peringkat lengkap{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
