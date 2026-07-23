import "server-only";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getViewer() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_seed,role,level,rating")
    .eq("id", data.user.id)
    .single();
  return profile ? { user: data.user, profile } : null;
}

export async function requireUser() {
  const viewer = await getViewer();
  if (!viewer)
    redirect("/auth/sign-in?message=Silakan%20masuk%20untuk%20melanjutkan.");
  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireUser();
  if (viewer.profile.role !== "admin")
    redirect("/dashboard?message=Akses%20admin%20diperlukan.");
  return viewer;
}
