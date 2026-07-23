import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/auth-form";

export const metadata = { title: "Lupa Password" };
export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Pemulihan akun"
      title="Buat jalur masuk baru."
      description="Kami akan mengirim tautan pemulihan jika alamat email terdaftar."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
