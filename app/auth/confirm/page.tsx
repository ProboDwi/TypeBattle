import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Konfirmasi Akun" };

export default async function ConfirmAccountPage({
  searchParams,
}: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "email";
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  const linkComplete = Boolean(tokenHash && type);

  return (
    <AuthCard
      eyebrow="Verifikasi email"
      title="Satu langkah lagi."
      description="Tekan tombol di bawah untuk mengaktifkan akun Keylane pada perangkat ini."
    >
      {linkComplete ? (
        <form action="/auth/callback" method="post">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <Button type="submit" className="w-full">
            Konfirmasi akun
          </Button>
          <p className="mt-4 text-center text-sm leading-6 text-muted">
            Token baru digunakan setelah tombol ditekan, sehingga aman dibuka
            dari HP atau perangkat lain.
          </p>
        </form>
      ) : (
        <p
          role="alert"
          className="rounded-[7px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          Tautan konfirmasi tidak lengkap. Minta email verifikasi yang baru.
        </p>
      )}
    </AuthCard>
  );
}
