"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Clock3,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Ringkasan", icon: BarChart3 },
  { href: "/history", label: "Histori", icon: Clock3 },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function AccountNav({
  profile,
}: {
  profile: {
    username: string;
    display_name: string;
    avatar_seed: string;
    role: string;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <aside className="panel h-fit overflow-hidden lg:sticky lg:top-24">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Avatar seed={profile.avatar_seed} label={profile.display_name} />
        <div className="min-w-0">
          <p className="truncate font-bold">{profile.display_name}</p>
          <p className="truncate font-mono text-xs text-muted">
            @{profile.username}
          </p>
        </div>
      </div>
      <nav className="grid p-2" aria-label="Navigasi akun">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-semibold text-muted hover:bg-sand hover:text-ink",
              pathname === href && "bg-sand text-ink",
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
        <Link
          href={`/profile/${profile.username}`}
          className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-semibold text-muted hover:bg-sand hover:text-ink"
        >
          <UserRound size={17} />
          Profil publik
        </Link>
        {profile.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-semibold text-accent hover:bg-sand"
          >
            <ShieldCheck size={17} />
            Panel admin
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-left text-sm font-semibold text-muted hover:bg-sand hover:text-danger"
        >
          <LogOut size={17} />
          Keluar
        </button>
      </nav>
    </aside>
  );
}
