import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("confirms through a styled accessible dialog", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Batalkan room ini?"
        description="Room akan dibatalkan untuk semua pemain."
        confirmLabel="Ya, batalkan room"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Batalkan room ini?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ya, batalkan room" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("closes with Escape and locks page scrolling while open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Batalkan room ini?"
        description="Konfirmasi pembatalan."
        confirmLabel="Ya, batalkan room"
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
