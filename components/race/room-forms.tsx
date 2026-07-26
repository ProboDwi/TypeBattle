"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActiveRaceRoom } from "@/lib/race/active-room";
import { QUICK_RACE_BOT_WAIT_MS } from "@/lib/race/bot";

interface CategoryOption {
  id: string;
  name: string;
}

export function CreateRoomForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const openRoom = (room: { code: string }) => {
      router.push(`/race/${room.code}`);
      router.refresh();
    };
    const recoverActiveRoom = async (): Promise<ActiveRaceRoom | null> => {
      try {
        const response = await fetch("/api/races/active", {
          cache: "no-store",
        });
        const result = await response.json();
        return result.success ? result.data.activeRoom : null;
      } catch {
        return null;
      }
    };

    try {
      const response = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          maxPlayers: Number(values.get("maxPlayers")),
          difficulty: values.get("difficulty") || null,
          categoryId: values.get("categoryId") || null,
        }),
      });
      const result = await response.json();
      if (result.success) return openRoom(result.data);

      const activeRoom = result.data?.activeRoom ?? (await recoverActiveRoom());
      if (activeRoom) return openRoom(activeRoom);
      setMessage(result.message ?? "Room belum dapat dibuat.");
    } catch {
      const activeRoom = await recoverActiveRoom();
      if (activeRoom) return openRoom(activeRoom);
      setMessage(
        "Koneksi terputus dan room belum dapat dipastikan. Coba lagi setelah koneksi pulih.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="panel p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Nama room</span>
          <input
            className="field"
            name="name"
            maxLength={60}
            minLength={3}
            required
            placeholder="Sprint malam Jumat"
          />
        </label>
        <div>
          <span className="label">Akses</span>
          <div className="rounded-[7px] border border-line bg-sand px-4 py-3 font-bold">
            Private — dengan kode
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            Room public dibuat otomatis melalui Quick Race.
          </p>
        </div>
        <label>
          <span className="label">Maksimal pemain</span>
          <select className="field" name="maxPlayers" defaultValue="5">
            {[2, 3, 4, 5, 6, 7, 8].map((count) => (
              <option key={count} value={count}>
                {count} pemain
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Kesulitan</span>
          <select className="field" name="difficulty">
            <option value="">Acak</option>
            <option value="easy">Mudah</option>
            <option value="medium">Menengah</option>
            <option value="hard">Sulit</option>
          </select>
        </label>
        <label>
          <span className="label">Kategori</span>
          <select className="field" name="categoryId">
            <option value="">Semua kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-7 w-full">
        {pending ? "Membuat room…" : "Buat room"}
      </Button>
    </form>
  );
}

export function JoinRoomForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/races/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const result = await response.json();
    setPending(false);
    if (!result.success) return setMessage(result.message);
    router.push(`/race/${result.data.code}`);
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="panel p-6 sm:p-8">
      <label>
        <span className="label">Kode room</span>
        <input
          className="field text-center font-mono text-2xl uppercase tracking-[.28em]"
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value
                .toUpperCase()
                .replace(/[O0I1]/g, "")
                .slice(0, 6),
            )
          }
          pattern="[A-HJ-NP-Z2-9]{6}"
          maxLength={6}
          autoComplete="off"
          required
          placeholder="A7K2MN"
        />
      </label>
      {message && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {message}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending || code.length !== 6}
        className="mt-7 w-full"
      >
        {pending ? "Memeriksa kode…" : "Gabung room"}
      </Button>
    </form>
  );
}

export function QuickMatchButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "waiting">("idle");
  const [message, setMessage] = useState("");
  const botRequestedRef = useRef(false);
  useEffect(() => {
    if (status !== "waiting") return;
    const interval = window.setInterval(async () => {
      const response = await fetch("/api/matchmaking/status");
      const result = await response.json();
      if (result.success && result.data.code) {
        setStatus("idle");
        router.push(`/race/${result.data.code}`);
        router.refresh();
        return;
      }
      const queuedAt = new Date(String(result.data?.queuedAt ?? "")).getTime();
      if (
        result.success &&
        Number.isFinite(queuedAt) &&
        Date.now() - queuedAt >= QUICK_RACE_BOT_WAIT_MS &&
        !botRequestedRef.current
      ) {
        botRequestedRef.current = true;
        const botResponse = await fetch("/api/matchmaking/bot", {
          method: "POST",
        });
        const botResult = await botResponse.json();
        if (botResult.success && botResult.data?.code) {
          setStatus("idle");
          router.push(`/race/${botResult.data.code}`);
          router.refresh();
          return;
        }
        botRequestedRef.current = false;
        setMessage(botResult.message);
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [router, status]);
  async function join() {
    setMessage("");
    botRequestedRef.current = false;
    const response = await fetch("/api/matchmaking/join", { method: "POST" });
    const result = await response.json();
    if (!result.success) return setMessage(result.message);
    if (result.data.code) {
      router.push(`/race/${result.data.code}`);
      router.refresh();
    } else {
      setStatus("waiting");
      setMessage(
        "Mencari pemain dengan rating berdekatan. Jika belum ditemukan dalam 10 detik, KeyBot akan masuk.",
      );
    }
  }
  async function leave() {
    await fetch("/api/matchmaking/leave", { method: "POST" });
    botRequestedRef.current = false;
    setStatus("idle");
    setMessage("Pencarian dibatalkan.");
  }
  return (
    <div>
      <Button
        onClick={status === "waiting" ? leave : join}
        variant={status === "waiting" ? "danger" : "primary"}
        className="w-full"
      >
        {status === "waiting" ? "Batalkan pencarian" : "Cari lawan"}
      </Button>
      {message && (
        <p role="status" className="mt-3 text-sm leading-6 text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
