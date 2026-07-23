import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-form";

export const metadata = { title: "Atur Ulang Password" };
export default function ResetPasswordPage() {
  return (
    <AuthCard
      eyebrow="Password baru"
      title="Amankan akunmu."
      description="Gunakan minimal delapan karakter dan hindari password yang dipakai pada layanan lain."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
