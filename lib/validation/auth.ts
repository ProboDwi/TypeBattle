import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username minimal 3 karakter.")
  .max(20, "Username maksimal 20 karakter.")
  .regex(/^[a-z0-9_]+$/, "Gunakan huruf kecil, angka, atau underscore.");

export const signInSchema = z.object({
  email: z.email("Masukkan alamat email yang valid.").trim().toLowerCase(),
  password: z.string().min(1, "Masukkan password."),
});

export const signUpSchema = z
  .object({
    email: z.email("Masukkan alamat email yang valid.").trim().toLowerCase(),
    username: usernameSchema,
    displayName: z
      .string()
      .trim()
      .min(1, "Nama tampilan wajib diisi.")
      .max(50, "Maksimal 50 karakter."),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter.")
      .max(128, "Password terlalu panjang."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama.",
  });

export const emailSchema = z.object({
  email: z.email("Masukkan alamat email yang valid.").trim().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter.").max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama.",
  });
