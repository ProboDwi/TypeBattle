import { AccountShell } from "@/components/dashboard/account-shell";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const viewer = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,bio,avatar_seed,role")
      .eq("id", viewer.user.id)
      .single(),
    supabase
      .from("user_preferences")
      .select("sound_enabled,reduced_motion,game_theme")
      .eq("user_id", viewer.user.id)
      .maybeSingle(),
  ]);
  const current = profile ?? viewer.profile;
  const shellProfile = {
    username: String(current.username),
    display_name: String(current.display_name),
    avatar_seed: String(current.avatar_seed),
    role: String(current.role),
  };
  return (
    <AccountShell profile={shellProfile}>
      <p className="eyebrow">Preferensi akun</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">Pengaturan.</h1>
      <p className="mt-2 mb-8 text-muted">
        Atur identitas publik dan pengalaman mengetikmu.
      </p>
      <SettingsForm
        initialValues={{
          username: String(current.username),
          displayName: String(current.display_name),
          bio: String(profile?.bio ?? ""),
          avatarSeed: String(current.avatar_seed),
          soundEnabled: Boolean(preferences?.sound_enabled ?? true),
          reducedMotion: Boolean(preferences?.reduced_motion ?? false),
          gameTheme:
            preferences?.game_theme === "light" ||
            preferences?.game_theme === "dark"
              ? preferences.game_theme
              : "system",
        }}
      />
    </AccountShell>
  );
}
