"use client";

import { DoorOpen, LogOut, Radio, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ActiveRaceRoom } from "@/lib/race/active-room";

const statusLabels: Record<ActiveRaceRoom["status"], string> = {
  waiting: "Menunggu pemain",
  countdown: "Hitung mundur",
  racing: "Sedang balapan",
};

export function ActiveRoomCard({ room }: { room: ActiveRaceRoom }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canCancel = room.isHost && room.status !== "racing";

  async function endParticipation() {
    setPending(true);
    setMessage("");
    try {
      const action = canCancel ? "cancel" : "leave";
      const response = await fetch(`/api/races/${room.roomId}/${action}`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setMessage(result.message ?? "Room belum dapat diperbarui.");
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setMessage("Koneksi terputus. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  function closeConfirmation() {
    if (pending) return;
    setConfirmOpen(false);
    setMessage("");
  }

  return (
    <>
      <section className="panel mt-8 overflow-hidden border-accent/50">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">
              <Radio size={13} className="text-accent" /> Room aktif kamu
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold">{room.name}</h2>
              <span className="rounded border border-line bg-paper px-2.5 py-1 font-mono text-sm font-bold tracking-[.16em]">
                {room.code}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {statusLabels[room.status]} ·{" "}
              {room.isHost ? "Kamu adalah host" : "Kamu adalah peserta"}
            </p>
            <p className="mt-4 max-w-2xl leading-7 text-muted">
              Room tetap tersimpan walaupun respons pembuatan atau perpindahan
              halaman sempat gagal. Kamu dapat membukanya kembali atau
              mengakhirinya di sini.
            </p>
          </div>
          <div className="grid min-w-48 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <ButtonLink href={`/race/${room.code}`} className="w-full">
              <DoorOpen size={16} /> Buka room
            </ButtonLink>
            <Button
              onClick={() => {
                setMessage("");
                setConfirmOpen(true);
              }}
              disabled={pending}
              variant={canCancel ? "danger" : "quiet"}
              className="w-full"
            >
              {canCancel ? <Trash2 size={16} /> : <LogOut size={16} />}
              {canCancel ? "Batalkan room" : "Keluar dari room"}
            </Button>
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={confirmOpen}
        title={canCancel ? "Batalkan room ini?" : "Keluar dari room ini?"}
        description={
          canCancel
            ? `Room “${room.name}” akan dibatalkan untuk semua pemain. Tindakan ini tidak dapat diurungkan.`
            : `Kamu akan keluar dari room “${room.name}” dan harus bergabung kembali memakai kode jika ingin masuk lagi.`
        }
        confirmLabel={canCancel ? "Ya, batalkan room" : "Ya, keluar"}
        pending={pending}
        error={message}
        onClose={closeConfirmation}
        onConfirm={endParticipation}
      />
    </>
  );
}
