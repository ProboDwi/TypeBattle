"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface Viewer {
  username: string;
  display_name: string;
  avatar_seed: string;
}

const mainLinks = [
  { href: "/practice", label: "Latihan" },
  { href: "/race", label: "Balapan" },
  { href: "/leaderboard", label: "Peringkat" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavigation({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();
  const accountHref = viewer ? "/dashboard" : "/auth/sign-in";
  const accountActive = viewer
    ? ["/dashboard", "/history", "/settings", "/profile", "/admin"].some(
        (href) => isActivePath(pathname, href),
      )
    : isActivePath(pathname, accountHref);

  return (
    <>
      <nav
        className="hidden items-center gap-7 text-sm font-semibold md:flex"
        aria-label="Navigasi utama"
      >
        {mainLinks.map(({ href, label }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              className={cn(
                "nav-link border-b-2 py-2",
                active
                  ? "border-accent !text-ink"
                  : "border-transparent",
              )}
              href={href}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        {viewer ? (
          <Link
            href={accountHref}
            aria-current={accountActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-[8px] border bg-card px-3 py-2 text-sm font-bold",
              accountActive
                ? "border-accent ring-1 ring-accent/20"
                : "border-line hover:border-ink",
            )}
          >
            <Avatar
              seed={viewer.avatar_seed}
              label={viewer.display_name}
              className="size-7"
            />
            <span>@{viewer.username}</span>
          </Link>
        ) : (
          <>
            <Link
              className={cn(
                "nav-link border-b-2 py-2",
                accountActive
                  ? "border-accent !text-ink"
                  : "border-transparent",
              )}
              href={accountHref}
              aria-current={accountActive ? "page" : undefined}
            >
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
          {mainLinks.map(({ href, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                className={cn(
                  "mobile-link",
                  active && "bg-sand text-ink",
                )}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
          <Link
            className={cn(
              "mobile-link",
              accountActive && "bg-sand text-ink",
            )}
            href={accountHref}
            aria-current={accountActive ? "page" : undefined}
          >
            {viewer ? "Dashboard" : "Masuk"}
          </Link>
        </nav>
      </details>
    </>
  );
}
