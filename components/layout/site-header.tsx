import Link from "next/link";
import { Menu } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";

async function getViewer() {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username,display_name,avatar_seed")
      .eq("id", data.user.id)
      .single();
    return profile;
  } catch {
    return null;
  }
}

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="page-shell flex h-[72px] items-center justify-between gap-5">
        <Link href="/" className="wordmark" aria-label="Keylane, beranda">
          KEY<span>LANE</span>
        </Link>
        <nav
          className="hidden items-center gap-7 text-sm font-semibold md:flex"
          aria-label="Navigasi utama"
        >
          <Link className="nav-link" href="/practice">
            Latihan
          </Link>
          <Link className="nav-link" href="/race">
            Balapan
          </Link>
          <Link className="nav-link" href="/leaderboard">
            Peringkat
          </Link>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {viewer ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-[8px] border border-line bg-card px-3 py-2 text-sm font-bold hover:border-ink"
            >
              <Avatar
                seed={String(viewer.avatar_seed)}
                label={String(viewer.display_name)}
                className="size-7"
              />
              <span>@{String(viewer.username)}</span>
            </Link>
          ) : (
            <>
              <Link className="nav-link" href="/auth/sign-in">
                Masuk
              </Link>
              <ButtonLink href="/practice">Mulai mengetik</ButtonLink>
            </>
          )}
        </div>
        <details className="relative md:hidden">
          <summary
            className="grid size-10 cursor-pointer list-none place-items-center rounded-[7px] border border-line bg-card"
            aria-label="Buka navigasi"
          >
            <Menu size={19} aria-hidden="true" />
          </summary>
          <nav
            className="absolute right-0 mt-2 grid min-w-52 gap-1 rounded-[8px] border border-line bg-card p-2 shadow-sm"
            aria-label="Navigasi seluler"
          >
            <Link className="mobile-link" href="/practice">
              Latihan
            </Link>
            <Link className="mobile-link" href="/race">
              Balapan
            </Link>
            <Link className="mobile-link" href="/leaderboard">
              Peringkat
            </Link>
            <Link
              className="mobile-link"
              href={viewer ? "/dashboard" : "/auth/sign-in"}
            >
              {viewer ? "Dashboard" : "Masuk"}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
