import { AdminNav } from "@/components/admin/admin-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { requireAdmin } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <SiteHeader />
      <div className="grid lg:grid-cols-[235px_1fr]">
        <AdminNav />
        <main className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    </>
  );
}
