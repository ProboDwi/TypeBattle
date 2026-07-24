"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  emailSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

interface AuthResponse {
  success: boolean;
  data: { redirectTo?: string; requiresEmailConfirmation?: boolean } | null;
  message: string;
  errors: Record<string, string[]> | null;
}

async function submitAuth(
  endpoint: string,
  values: object,
): Promise<AuthResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  return response.json() as Promise<AuthResponse>;
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  error,
  registration,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const errorId = `${id}-error`;
  const isPassword = type === "password";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const resolvedType = isPassword && passwordVisible ? "text" : type;

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          autoComplete={autoComplete}
          className={isPassword ? "field pr-12" : "field"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...registration}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted transition-colors hover:text-ink"
            aria-label={
              passwordVisible ? "Sembunyikan password" : "Tampilkan password"
            }
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? (
              <EyeOff size={19} aria-hidden="true" />
            ) : (
              <Eye size={19} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SignInForm({
  redirectTo = "/dashboard",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
  });
  const onSubmit = handleSubmit(async (values) => {
    setMessage("");
    const result = await submitAuth("/api/auth/sign-in", values);
    if (!result.success) return setMessage(result.message);
    router.push(redirectTo || result.data?.redirectTo || "/dashboard");
    router.refresh();
  });
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        registration={register("email")}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        registration={register("password")}
      />
      <div className="text-right">
        <Link
          href="/auth/forgot-password"
          className="text-sm font-bold text-accent hover:underline"
        >
          Lupa password?
        </Link>
      </div>
      {message && (
        <p
          role="alert"
          className="rounded-[7px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          {message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Memeriksa…" : "Masuk"}
      </Button>
      <p className="text-center text-sm text-muted">
        Belum punya akun?{" "}
        <Link
          className="font-bold text-ink hover:underline"
          href="/auth/sign-up"
        >
          Daftar sekarang
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
  });
  const onSubmit = handleSubmit(async (values) => {
    setMessage("");
    const result = await submitAuth("/api/auth/sign-up", values);
    setMessage(result.message);
    if (!result.success) return;
    setSuccess(true);
    if (!result.data?.requiresEmailConfirmation) {
      router.push(result.data?.redirectTo ?? "/dashboard");
      router.refresh();
    }
  });
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        registration={register("email")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="username"
          label="Username"
          autoComplete="username"
          error={errors.username?.message}
          registration={register("username")}
        />
        <Field
          id="displayName"
          label="Nama tampilan"
          autoComplete="name"
          error={errors.displayName?.message}
          registration={register("displayName")}
        />
      </div>
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        registration={register("password")}
      />
      <Field
        id="confirmPassword"
        label="Ulangi password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        registration={register("confirmPassword")}
      />
      {message && (
        <p
          role={success ? "status" : "alert"}
          className={`rounded-[7px] border p-3 text-sm ${success ? "border-moss/30 bg-moss/5 text-moss" : "border-danger/30 bg-danger/5 text-danger"}`}
        >
          {message}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || success}
      >
        {isSubmitting
          ? "Membuat akun…"
          : success
            ? "Periksa emailmu"
            : "Buat akun"}
      </Button>
      <p className="text-center text-sm text-muted">
        Sudah punya akun?{" "}
        <Link
          className="font-bold text-ink hover:underline"
          href="/auth/sign-in"
        >
          Masuk
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
  });
  const onSubmit = handleSubmit(async (values) => {
    const result = await submitAuth("/api/auth/forgot-password", values);
    setSuccess(result.success);
    setMessage(result.message);
  });
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        id="email"
        label="Email akun"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        registration={register("email")}
      />
      {message && (
        <p
          role={success ? "status" : "alert"}
          className={`rounded-[7px] border p-3 text-sm ${success ? "border-moss/30 bg-moss/5 text-moss" : "border-danger/30 bg-danger/5 text-danger"}`}
        >
          {message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Mengirim…" : "Kirim tautan pemulihan"}
      </Button>
      <p className="text-center text-sm">
        <Link
          className="font-bold text-ink hover:underline"
          href="/auth/sign-in"
        >
          Kembali masuk
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
  });
  const onSubmit = handleSubmit(async (values) => {
    const result = await submitAuth("/api/auth/reset-password", values);
    setMessage(result.message);
    if (result.success) {
      setTimeout(() => {
        router.push(result.data?.redirectTo ?? "/dashboard");
        router.refresh();
      }, 700);
    }
  });
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        id="password"
        label="Password baru"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        registration={register("password")}
      />
      <Field
        id="confirmPassword"
        label="Ulangi password baru"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        registration={register("confirmPassword")}
      />
      {message && (
        <p
          role="status"
          className="rounded-[7px] border border-line bg-sand p-3 text-sm"
        >
          {message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan…" : "Simpan password baru"}
      </Button>
    </form>
  );
}
