import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const variants = {
  primary:
    "border-accent bg-accent text-white hover:bg-[#cf4c1e] hover:border-[#cf4c1e]",
  secondary: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
  quiet: "border-line bg-card text-ink hover:border-ink",
  danger: "border-danger bg-danger text-white hover:bg-[#9e332d]",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("button-base", variants[variant], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("button-base", variants[variant], className)}
    >
      {children}
    </Link>
  );
}
