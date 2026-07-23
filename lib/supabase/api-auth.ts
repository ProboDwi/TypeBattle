import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getApiAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

export function friendlyRaceError(message?: string): string {
  if (!message) return "Permintaan balapan belum dapat diproses.";
  if (message.includes("full")) return "Room sudah penuh.";
  if (message.includes("not found")) return "Room tidak ditemukan.";
  if (message.includes("already started"))
    return "Balapan sudah dimulai atau selesai.";
  if (message.includes("another room") || message.includes("active room"))
    return "Kamu masih terdaftar di room aktif lain.";
  if (message.includes("ready"))
    return "Semua pemain harus siap sebelum balapan dimulai.";
  if (message.includes("host"))
    return "Tindakan ini hanya dapat dilakukan host.";
  if (message.includes("expired")) return "Room sudah kedaluwarsa.";
  return "Permintaan balapan ditolak karena status room telah berubah.";
}
