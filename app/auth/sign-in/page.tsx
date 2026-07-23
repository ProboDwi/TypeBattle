import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/auth-form";
import { safeInternalPath } from "@/lib/security/redirect";

export const metadata = { title: "Masuk" };
export default async function SignInPage({
  searchParams,
}: PageProps<"/auth/sign-in">) {
  const params = await searchParams;
  const message = typeof params.message === "string" ? params.message : null;
  const redirectTo = safeInternalPath(
    typeof params.next === "string" ? params.next : null,
  );
  return (
    <AuthCard
      eyebrow="Masuk lintasan"
      title="Lanjutkan ritmemu."
      description="Masuk untuk menyimpan hasil, naik peringkat, dan bergabung ke balapan."
    >
      {message && (
        <p
          role="status"
          className="mb-5 rounded-[7px] border border-line bg-sand p-3 text-sm"
        >
          {message}
        </p>
      )}
      <SignInForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
