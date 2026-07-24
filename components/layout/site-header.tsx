import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { SiteNavigation } from "@/components/layout/site-navigation";

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
        <SiteNavigation
          viewer={
            viewer
              ? {
                  username: String(viewer.username),
                  display_name: String(viewer.display_name),
                  avatar_seed: String(viewer.avatar_seed),
                }
              : null
          }
        />
      </div>
    </header>
  );
}
