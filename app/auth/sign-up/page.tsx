import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/auth-form";

export const metadata = { title: "Daftar" };
export default function SignUpPage() {
  return (
    <AuthCard
      eyebrow="Buat nomor peserta"
      title="Mulai catatan pertamamu."
      description="Akun baru selalu berperan sebagai player. Statistik hanya berubah melalui hasil resmi."
    >
      <SignUpForm />
    </AuthCard>
  );
}
