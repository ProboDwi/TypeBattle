"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function RoleControl({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [nextRole, setNextRole] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function update() {
    if (!nextRole) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const result = await response.json();
      setMessage(result.message);
      if (!response.ok || !result.success) {
        setError(result.message ?? "Role belum dapat diubah.");
        return;
      }
      setNextRole(null);
      router.refresh();
    } catch {
      setError("Koneksi terputus. Coba lagi.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div>
        <select
          className="field min-h-9 py-1 text-xs"
          value={role}
          onChange={(event) => {
            setError("");
            setNextRole(event.target.value);
          }}
        >
          <option value="player">player</option>
          <option value="admin">admin</option>
        </select>
        {message && (
          <span className="mt-1 block max-w-32 text-[10px] text-muted">
            {message}
          </span>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(nextRole)}
        title="Ubah role pengguna?"
        description={`Role akun ini akan diubah dari “${role}” menjadi “${nextRole ?? role}”. Perubahan hak akses berlaku segera.`}
        confirmLabel="Ya, ubah role"
        pending={pending}
        error={error}
        onClose={() => {
          if (pending) return;
          setNextRole(null);
          setError("");
        }}
        onConfirm={update}
      />
    </>
  );
}
export function ModerateResult({
  id,
  type,
}: {
  id: string;
  type: "practice" | "race";
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function decide() {
    if (decision === null) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/results/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          valid: decision,
          note: decision ? "Diverifikasi admin" : "Ditolak admin",
        }),
      });
      const result = await response.json();
      setMessage(result.message);
      if (!response.ok || !result.success) {
        setError(result.message ?? "Hasil belum dapat dimoderasi.");
        return;
      }
      setDecision(null);
      router.refresh();
    } catch {
      setError("Koneksi terputus. Coba lagi.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setError("");
            setDecision(true);
          }}
          className="text-xs font-bold text-moss hover:underline"
        >
          Valid
        </button>
        <button
          onClick={() => {
            setError("");
            setDecision(false);
          }}
          className="text-xs font-bold text-danger hover:underline"
        >
          Invalid
        </button>
        {message && (
          <span className="w-full text-[10px] text-muted">{message}</span>
        )}
      </div>
      <ConfirmDialog
        open={decision !== null}
        title={decision ? "Nyatakan hasil valid?" : "Nyatakan hasil invalid?"}
        description={
          decision
            ? "Status mencurigakan akan dicabut dan hasil kembali dianggap valid."
            : "Hasil akan ditandai invalid dan dikeluarkan dari perhitungan peringkat."
        }
        confirmLabel={decision ? "Ya, nyatakan valid" : "Ya, tandai invalid"}
        confirmVariant={decision ? "primary" : "danger"}
        pending={pending}
        error={error}
        onClose={() => {
          if (pending) return;
          setDecision(null);
          setError("");
        }}
        onConfirm={decide}
      />
    </>
  );
}
