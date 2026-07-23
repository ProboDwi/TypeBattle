"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "secondary" | "quiet" | "danger";
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  pending = false,
  error = "",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current
      ?.querySelector<HTMLButtonElement>("[data-dialog-cancel]")
      ?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !pending) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/65 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !pending) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md overflow-hidden rounded-[10px] border border-line bg-card shadow-[10px_10px_0_rgba(25,27,31,.28)]"
      >
        <div className="flex items-start gap-4 p-6 sm:p-7">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-bold tracking-[-.02em]">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
              {description}
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            disabled={pending}
            className="rounded p-1 text-muted transition-colors hover:bg-sand hover:text-ink disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mx-6 mb-5 rounded-[7px] border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-6 text-danger sm:mx-7"
          >
            {error}
          </p>
        )}
        <div className="grid gap-2 border-t border-line bg-paper/60 p-4 sm:grid-cols-2 sm:p-5">
          <Button
            data-dialog-cancel
            onClick={onClose}
            disabled={pending}
            variant="quiet"
          >
            Kembali
          </Button>
          <Button
            onClick={() => void onConfirm()}
            disabled={pending}
            variant={confirmVariant}
          >
            {pending ? "Memproses…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
