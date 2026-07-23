import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AccountNav } from "@/components/dashboard/account-nav";

export function AccountShell({
  profile,
  children,
}: {
  profile: {
    username: string;
    display_name: string;
    avatar_seed: string;
    role: string;
  };
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="page-shell grid min-h-[75vh] gap-7 py-10 lg:grid-cols-[230px_1fr]">
        <AccountNav profile={profile} />
        <div className="min-w-0">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
