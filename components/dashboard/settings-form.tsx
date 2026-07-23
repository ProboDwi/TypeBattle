"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { settingsSchema } from "@/lib/validation/profile";

type SettingsValues = z.infer<typeof settingsSchema>;

export function SettingsForm({
  initialValues,
}: {
  initialValues: SettingsValues;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialValues,
  });
  const avatarSeed = useWatch({ control, name: "avatarSeed" });
  const displayName = useWatch({ control, name: "displayName" });
  const onSubmit = handleSubmit(async (values) => {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    setIsError(!result.success);
    setMessage(result.message);
    if (result.success) router.refresh();
  });
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <section className="panel p-5 sm:p-7">
        <h2 className="text-lg font-bold">Profil publik</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr]">
          <Avatar
            seed={avatarSeed || "keylane"}
            label={displayName || "pemain"}
            className="size-20"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SettingField label="Username" error={errors.username?.message}>
              <input
                className="field"
                autoComplete="username"
                {...register("username")}
              />
            </SettingField>
            <SettingField
              label="Nama tampilan"
              error={errors.displayName?.message}
            >
              <input
                className="field"
                autoComplete="name"
                {...register("displayName")}
              />
            </SettingField>
            <SettingField
              label="Avatar seed"
              error={errors.avatarSeed?.message}
            >
              <input className="field font-mono" {...register("avatarSeed")} />
            </SettingField>
            <div className="sm:col-span-2">
              <SettingField label="Bio" error={errors.bio?.message}>
                <textarea
                  className="field min-h-28 resize-y"
                  {...register("bio")}
                />
              </SettingField>
            </div>
          </div>
        </div>
      </section>
      <section className="panel p-5 sm:p-7">
        <h2 className="text-lg font-bold">Preferensi permainan</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-[7px] border border-line p-4">
            <input
              type="checkbox"
              className="size-4 accent-[#E95D2A]"
              {...register("soundEnabled")}
            />
            <span>
              <strong className="block text-sm">Suara</strong>
              <span className="mt-1 block text-xs text-muted">
                Efek fungsional selama permainan.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-[7px] border border-line p-4">
            <input
              type="checkbox"
              className="size-4 accent-[#E95D2A]"
              {...register("reducedMotion")}
            />
            <span>
              <strong className="block text-sm">Kurangi gerakan</strong>
              <span className="mt-1 block text-xs text-muted">
                Kurangi transisi marker dan countdown.
              </span>
            </span>
          </label>
          <SettingField label="Tema area permainan">
            <select className="field" {...register("gameTheme")}>
              <option value="system">Ikuti perangkat</option>
              <option value="light">Terang</option>
              <option value="dark">Gelap</option>
            </select>
          </SettingField>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
        <p
          role="status"
          className={isError ? "text-sm text-danger" : "text-sm text-moss"}
        >
          {message}
        </p>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan pengaturan"}
        </Button>
      </div>
    </form>
  );
}

function SettingField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}
