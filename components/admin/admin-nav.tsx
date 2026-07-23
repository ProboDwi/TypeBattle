import Link from "next/link";
import {
  BookOpenText,
  Flag,
  Gauge,
  LayoutDashboard,
  ShieldAlert,
  Tags,
  Users,
} from "lucide-react";

const links = [
  ["/admin", "Ringkasan", LayoutDashboard],
  ["/admin/texts", "Teks", BookOpenText],
  ["/admin/categories", "Kategori", Tags],
  ["/admin/users", "Pengguna", Users],
  ["/admin/races", "Race", Flag],
  ["/admin/results", "Hasil mencurigakan", ShieldAlert],
] as const;

export function AdminNav() {
  return (
    <aside className="border-b border-line bg-ink text-paper lg:min-h-[calc(100vh-72px)] lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="p-5">
        <div className="flex items-center gap-2 font-bold">
          <Gauge size={18} className="text-flare" /> Race control
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[.13em] text-white/35">
          Admin only
        </p>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-t border-white/10 p-2 lg:grid"
        aria-label="Navigasi admin"
      >
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className="flex shrink-0 items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
