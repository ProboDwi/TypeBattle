"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Check,
  Clipboard,
  LogOut,
  Settings2,
  UserMinus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TypingCapture } from "@/components/game/typing-capture";
import { createClient } from "@/lib/supabase/client";
import {
  createTypingState,
  getTypingMetrics,
  typingReducer,
} from "@/lib/typing/engine";
import { formatDuration } from "@/lib/utils/format";

export interface RaceParticipantView {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  rating: number;
  isReady: boolean;
  connectionStatus: string;
  raceStatus: string;
  progress: number;
  currentCharacter: number;
  incorrectKeystrokes: number;
  totalKeystrokes: number;
  lastSequence: number;
  wpm: number;
  placement: number | null;
  finishNonce: string | null;
}

export interface RaceRoomView {
  id: string;
  code: string;
  name: string;
  hostId: string;
  status: string;
  visibility: "public" | "private";
  maxPlayers: number;
  difficulty: string | null;
  categoryId: string | null;
  startsAt: string | null;
  text: {
    id: string;
    title: string;
    content: string;
    difficulty: string;
  } | null;
}

type ConnectionState = "connecting" | "online" | "reconnecting" | "offline";
type BroadcastPayload = Record<string, unknown>;

function appendIntegrityEvent(
  target: React.RefObject<string[]>,
  event: string,
) {
  if (!target.current.includes(event) && target.current.length < 30) {
    target.current.push(event);
  }
}

export function RaceRoomClient({
  initialRoom,
  initialParticipants,
  viewerId,
  categories,
}: {
  initialRoom: RaceRoomView;
  initialParticipants: RaceParticipantView[];
  viewerId: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const [participants, setParticipants] = useState(initialParticipants);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leavePending, setLeavePending] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [kickTarget, setKickTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [kickPending, setKickPending] = useState(false);
  const [kickError, setKickError] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finishPending, setFinishPending] = useState(false);
  const [ownResult, setOwnResult] = useState<{
    placement: number;
    wpm: number;
    accuracy: number;
    ratingChange: number;
  } | null>(null);
  const [typing, dispatch] = useReducer(
    typingReducer,
    createTypingState(initialRoom.text?.content ?? ""),
  );

  const typingRef = useRef(typing);
  const participantsRef = useRef(participants);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startPerformanceRef = useRef(0);
  const lastBroadcastRef = useRef(0);
  const lastSnapshotRef = useRef(0);
  const sequenceRef = useRef(0);
  const remoteSequencesRef = useRef<Record<string, number>>({});
  const finishingRef = useRef(false);
  const startSyncRef = useRef(false);
  const focusLossesRef = useRef(0);
  const integrityEventsRef = useRef<string[]>([]);

  useEffect(() => {
    typingRef.current = typing;
  }, [typing]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRoom(initialRoom);
      setParticipants(initialParticipants);
      const own = initialParticipants.find((item) => item.userId === viewerId);
      if (!initialRoom.text || !own) return;
      sequenceRef.current = Math.max(sequenceRef.current, own.lastSequence);
      const current = typingRef.current;
      if (
        current.content !== initialRoom.text.content ||
        !current.started ||
        own.currentCharacter > current.currentCharacter
      ) {
        dispatch({
          type: "RESTORE",
          content: initialRoom.text.content,
          currentCharacter: own.currentCharacter,
          incorrectKeystrokes: own.incorrectKeystrokes,
          totalKeystrokes: own.totalKeystrokes,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialParticipants, initialRoom, viewerId]);

  const ownParticipant = participants.find(
    (participant) => participant.userId === viewerId,
  );
  const isHost = room.hostId === viewerId;
  const metrics = useMemo(
    () => getTypingMetrics(typing, elapsedMs),
    [typing, elapsedMs],
  );
  const activeRace = room.status === "countdown" || room.status === "racing";
  const displayedParticipants = useMemo(
    () =>
      participants.map((participant) =>
        participant.userId === viewerId && typing.started
          ? {
              ...participant,
              progress: metrics.progress,
              currentCharacter: typing.currentCharacter,
              incorrectKeystrokes: typing.incorrectKeystrokes,
              totalKeystrokes: typing.totalKeystrokes,
              wpm: metrics.wpm,
            }
          : participant,
      ),
    [
      metrics.progress,
      metrics.wpm,
      participants,
      typing.currentCharacter,
      typing.incorrectKeystrokes,
      typing.started,
      typing.totalKeystrokes,
      viewerId,
    ],
  );

  const broadcast = useCallback(
    async (event: string, payload: BroadcastPayload = {}) => {
      await channelRef.current?.send({ type: "broadcast", event, payload });
    },
    [],
  );

  const refreshVerifiedState = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`race:${room.id}`, {
      config: {
        private: true,
        presence: { key: viewerId },
        broadcast: { self: true },
      },
    });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .on("broadcast", { event: "state_changed" }, refreshVerifiedState)
      .on("broadcast", { event: "player_progress" }, ({ payload }) => {
        const userId = String(payload.userId ?? "");
        const progress = Number(payload.progress);
        const displayWpm = Number(payload.displayWpm);
        const sequence = Number(payload.sequence);
        const sentAt = new Date(String(payload.sentAt)).getTime();
        const known = participantsRef.current.some(
          (participant) => participant.userId === userId,
        );
        if (
          !known ||
          userId === viewerId ||
          !Number.isFinite(progress) ||
          !Number.isFinite(displayWpm) ||
          !Number.isInteger(sequence) ||
          sequence <= (remoteSequencesRef.current[userId] ?? 0) ||
          Math.abs(Date.now() - sentAt) > 10_000
        ) {
          return;
        }
        remoteSequencesRef.current[userId] = sequence;
        setParticipants((items) =>
          items.map((item) => {
            if (
              item.userId !== userId ||
              progress < item.progress ||
              progress - item.progress > 35
            ) {
              return item;
            }
            return {
              ...item,
              progress: Math.min(100, progress),
              wpm: Math.max(0, displayWpm),
            };
          }),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnection("online");
          await channel.track({
            userId: viewerId,
            onlineAt: new Date().toISOString(),
          });
          refreshVerifiedState();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("reconnecting");
        } else if (status === "CLOSED") {
          setConnection("offline");
        }
      });

    const markOffline = () => setConnection("offline");
    const markReconnecting = () => setConnection("reconnecting");
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markReconnecting);

    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markReconnecting);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [refreshVerifiedState, room.id, viewerId]);

  const syncRaceState = useCallback(async () => {
    const response = await fetch(`/api/races/${room.id}/sync`, {
      method: "POST",
    });
    const result = await response.json().catch(() => null);
    if (result?.success) {
      refreshVerifiedState();
      if (result.data?.status === "finished") {
        await broadcast("state_changed", { reason: "race_finished" });
      }
    }
  }, [broadcast, refreshVerifiedState, room.id]);

  useEffect(() => {
    if (!activeRace) return;
    void syncRaceState();
    const interval = window.setInterval(() => void syncRaceState(), 5000);
    return () => window.clearInterval(interval);
  }, [activeRace, syncRaceState]);

  useEffect(() => {
    if (!activeRace || !room.startsAt || !room.text) return;
    const startAt = new Date(room.startsAt).getTime();
    const tick = () => {
      const difference = startAt - Date.now();
      setCountdown(Math.max(0, Math.ceil(difference / 1000)));
      if (difference <= 0 && !typingRef.current.started) {
        startPerformanceRef.current =
          performance.now() + Math.min(0, difference);
        dispatch({ type: "START" });
        requestAnimationFrame(() =>
          inputRef.current?.focus({ preventScroll: true }),
        );
      }
      if (difference <= 0) {
        setRoom((current) =>
          current.status === "countdown"
            ? { ...current, status: "racing" }
            : current,
        );
      }
      if (difference <= 0 && !startSyncRef.current) {
        startSyncRef.current = true;
        void syncRaceState().then(() =>
          broadcast("state_changed", { reason: "race_started" }),
        );
      }
    };
    tick();
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [activeRace, broadcast, room.startsAt, room.text, syncRaceState]);

  useEffect(() => {
    if (!activeRace || !typing.started || !room.startsAt) return;
    const officialStart = new Date(room.startsAt).getTime();
    startPerformanceRef.current =
      performance.now() - Math.max(0, Date.now() - officialStart);
    const interval = window.setInterval(
      () =>
        setElapsedMs(
          Math.max(0, performance.now() - startPerformanceRef.current),
        ),
      100,
    );
    return () => window.clearInterval(interval);
  }, [activeRace, room.startsAt, typing.started]);

  useEffect(() => {
    const recordVisibility = () => {
      if (document.hidden && activeRace && typingRef.current.started) {
        focusLossesRef.current += 1;
      }
    };
    document.addEventListener("visibilitychange", recordVisibility);
    return () =>
      document.removeEventListener("visibilitychange", recordVisibility);
  }, [activeRace]);

  useEffect(() => {
    if (!activeRace || !typing.started || typing.finished) return;
    const now = Date.now();
    if (now - lastBroadcastRef.current >= 180) {
      lastBroadcastRef.current = now;
      sequenceRef.current += 1;
      void broadcast("player_progress", {
        userId: viewerId,
        currentCharacter: typing.currentCharacter,
        progress: metrics.progress,
        displayWpm: metrics.wpm,
        displayAccuracy: metrics.accuracy,
        sequence: sequenceRef.current,
        sentAt: new Date().toISOString(),
      });
    }
    if (now - lastSnapshotRef.current >= 1000) {
      lastSnapshotRef.current = now;
      void fetch(`/api/races/${room.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentCharacter: typing.currentCharacter,
          incorrectKeystrokes: typing.incorrectKeystrokes,
          totalKeystrokes: typing.totalKeystrokes,
          sequence: sequenceRef.current,
        }),
      }).then(async (response) => {
        if (response.status === 409) {
          const result = await response.json();
          setMessage(result.message);
        }
      });
    }
  }, [activeRace, broadcast, metrics, room.id, typing, viewerId]);

  const finishRace = useCallback(async () => {
    const participant = participantsRef.current.find(
      (item) => item.userId === viewerId,
    );
    if (finishingRef.current) return;
    if (!participant?.finishNonce) {
      setMessage(
        "Token penyimpanan hasil belum tersedia. Muat ulang halaman lalu coba simpan lagi.",
      );
      return;
    }
    finishingRef.current = true;
    setFinishPending(true);
    try {
      const finalState = typingRef.current;
      const response = await fetch(`/api/races/${room.id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce: participant.finishNonce,
          currentCharacter: finalState.currentCharacter,
          incorrectKeystrokes: finalState.incorrectKeystrokes,
          totalKeystrokes: finalState.totalKeystrokes,
          clientDurationMs: Math.max(
            1,
            Math.round(performance.now() - startPerformanceRef.current),
          ),
          focusLosses: focusLossesRef.current,
          integrityEvents: integrityEventsRef.current,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setMessage(
          result?.message ??
            "Hasil belum tersimpan karena koneksi terputus. Coba simpan lagi.",
        );
        return;
      }
      setOwnResult({
        placement: Number(result.data.placement),
        wpm: Number(result.data.wpm),
        accuracy: Number(result.data.accuracy),
        ratingChange: Number(result.data.ratingChange),
      });
      if (result.data.suspicious) {
        setMessage(
          "Hasil ditahan untuk pemeriksaan dan tidak mengubah rating resmi.",
        );
      } else {
        setMessage("");
      }
      await broadcast("state_changed", { reason: "player_finished" });
      refreshVerifiedState();
    } catch {
      setMessage(
        "Hasil belum tersimpan karena koneksi terputus. Coba simpan lagi.",
      );
    } finally {
      finishingRef.current = false;
      setFinishPending(false);
    }
  }, [broadcast, refreshVerifiedState, room.id, viewerId]);

  useEffect(() => {
    if (typing.finished) void finishRace();
  }, [finishRace, typing.finished]);

  async function toggleReady() {
    if (!ownParticipant) return;
    const response = await fetch(`/api/races/${room.id}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ready: !ownParticipant.isReady }),
    });
    const result = await response.json();
    if (!result.success) return setMessage(result.message);
    await broadcast("state_changed", { reason: "ready_changed" });
    refreshVerifiedState();
  }

  async function startRace() {
    const response = await fetch(`/api/races/${room.id}/start`, {
      method: "POST",
    });
    const result = await response.json();
    if (!result.success) return setMessage(result.message);
    await broadcast("state_changed", { reason: "race_countdown" });
    refreshVerifiedState();
  }

  async function leaveRoom() {
    setLeavePending(true);
    setLeaveError("");
    try {
      const response = await fetch(`/api/races/${room.id}/leave`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setLeaveError(result.message ?? "Belum dapat keluar dari room.");
        return;
      }
      setLeaveOpen(false);
      await broadcast("state_changed", { reason: "player_left" });
      router.push("/race");
      router.refresh();
    } catch {
      setLeaveError("Koneksi terputus. Coba lagi.");
    } finally {
      setLeavePending(false);
    }
  }

  async function kickPlayer() {
    if (!kickTarget) return;
    setKickPending(true);
    setKickError("");
    try {
      const response = await fetch(`/api/races/${room.id}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: kickTarget.userId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setKickError(result.message ?? "Pemain belum dapat dikeluarkan.");
        return;
      }
      setKickTarget(null);
      await broadcast("state_changed", { reason: "player_kicked" });
      refreshVerifiedState();
    } catch {
      setKickError("Koneksi terputus. Coba lagi.");
    } finally {
      setKickPending(false);
    }
  }

  async function cancelRoom() {
    setCancelPending(true);
    setCancelError("");
    try {
      const response = await fetch(`/api/races/${room.id}/cancel`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setCancelError(result.message ?? "Room belum dapat dibatalkan.");
        return;
      }
      setCancelOpen(false);
      await broadcast("state_changed", { reason: "room_cancelled" });
      refreshVerifiedState();
    } catch {
      setCancelError("Koneksi terputus. Coba lagi.");
    } finally {
      setCancelPending(false);
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/race/join?code=${room.code}`,
    );
    setMessage("Tautan undangan disalin.");
  }

  const leaveConfirmation = (
    <ConfirmDialog
      open={leaveOpen}
      title={activeRace ? "Keluar dari race ini?" : "Keluar dari room ini?"}
      description={
        activeRace
          ? "Progres balapanmu akan dihentikan dan kamu akan keluar dari lintasan."
          : `Kamu akan keluar dari room “${room.name}” dan perlu bergabung kembali jika ingin masuk lagi.`
      }
      confirmLabel={activeRace ? "Ya, keluar dari race" : "Ya, keluar"}
      pending={leavePending}
      error={leaveError}
      onClose={() => {
        if (leavePending) return;
        setLeaveOpen(false);
        setLeaveError("");
      }}
      onConfirm={leaveRoom}
    />
  );

  const kickConfirmation = (
    <ConfirmDialog
      open={Boolean(kickTarget)}
      title="Keluarkan pemain ini?"
      description={`${kickTarget?.name ?? "Pemain"} akan dikeluarkan dari room dan harus bergabung kembali untuk masuk.`}
      confirmLabel="Ya, keluarkan pemain"
      pending={kickPending}
      error={kickError}
      onClose={() => {
        if (kickPending) return;
        setKickTarget(null);
        setKickError("");
      }}
      onConfirm={kickPlayer}
    />
  );

  if (!activeRace && room.status === "waiting") {
    const everyoneReady =
      participants.length >= 2 &&
      participants.every((participant) => participant.isReady);
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5 sm:p-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[.13em] text-muted">
                Lobby / {room.visibility}
              </p>
              <h1 className="mt-2 text-3xl font-bold">{room.name}</h1>
            </div>
            <button
              onClick={copyInvite}
              className="rounded-[7px] border border-line bg-sand px-4 py-3 text-left"
            >
              <span className="block font-mono text-[10px] uppercase tracking-[.12em] text-muted">
                Kode room
              </span>
              <span className="mt-1 block font-mono text-xl font-bold tracking-[.16em]">
                {room.code} <Clipboard className="inline" size={15} />
              </span>
            </button>
          </div>
          <div className="divide-y divide-line">
            {participants.map((participant, index) => (
              <div
                key={participant.userId}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-5"
              >
                <Avatar
                  seed={participant.avatarSeed}
                  label={participant.displayName}
                />
                <div>
                  <p className="font-bold">
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {participant.displayName}{" "}
                    {participant.userId === viewerId && (
                      <span className="text-xs text-accent">(kamu)</span>
                    )}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    @{participant.username} · {participant.rating} rating ·{" "}
                    {onlineIds.has(participant.userId) ? "online" : "offline"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {participant.isReady ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-moss">
                      <Check size={14} /> SIAP
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-muted">
                      MENUNGGU
                    </span>
                  )}
                  {isHost && participant.userId !== viewerId && (
                    <button
                      aria-label={`Keluarkan ${participant.username}`}
                      onClick={() => {
                        setKickError("");
                        setKickTarget({
                          userId: participant.userId,
                          name: participant.displayName,
                        });
                      }}
                      className="text-muted hover:text-danger"
                    >
                      <UserMinus size={17} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="space-y-3">
          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Kontrol room</h2>
              <ConnectionBadge state={connection} />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              {participants.length}/{room.maxPlayers} pemain ·{" "}
              {room.difficulty ?? "acak"}
            </p>
            <div className="mt-5 grid gap-2">
              <Button
                onClick={toggleReady}
                variant={ownParticipant?.isReady ? "quiet" : "primary"}
              >
                {ownParticipant?.isReady ? "Batalkan siap" : "Saya siap"}
              </Button>
              {isHost && (
                <Button
                  onClick={startRace}
                  variant="secondary"
                  disabled={!everyoneReady}
                >
                  Mulai balapan
                </Button>
              )}
              <Button
                onClick={() => {
                  setLeaveError("");
                  setLeaveOpen(true);
                }}
                variant="quiet"
              >
                <LogOut size={15} /> Keluar
              </Button>
              {isHost && (
                <Button
                  onClick={() => {
                    setCancelError("");
                    setCancelOpen(true);
                  }}
                  variant="danger"
                >
                  Batalkan room
                </Button>
              )}
            </div>
            {message && (
              <p role="status" className="mt-4 text-sm leading-6 text-muted">
                {message}
              </p>
            )}
          </section>
          {isHost && (
            <HostSettings
              room={room}
              categories={categories}
              onSaved={(next) => {
                setRoom((current) => ({ ...current, ...next }));
                void broadcast("state_changed", { reason: "settings_changed" });
              }}
            />
          )}
        </aside>
        <ConfirmDialog
          open={cancelOpen}
          title="Batalkan room ini?"
          description={`Room “${room.name}” akan dibatalkan untuk semua pemain dan tidak dapat dimulai kembali.`}
          confirmLabel="Ya, batalkan room"
          pending={cancelPending}
          error={cancelError}
          onClose={() => {
            if (cancelPending) return;
            setCancelOpen(false);
            setCancelError("");
          }}
          onConfirm={cancelRoom}
        />
        {leaveConfirmation}
        {kickConfirmation}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[9px] border border-[#303238] bg-ink text-paper">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
        <div>
          <p className="font-mono text-xs text-white/40">
            {room.name} / {room.code}
          </p>
          <h1 className="mt-1 text-xl font-bold">Race in progress</h1>
        </div>
        <div className="flex items-center gap-5 font-mono text-sm">
          <span>{participants.length} pemain</span>
          <span>{formatDuration(elapsedMs)}</span>
          <ConnectionBadge state={connection} dark />
        </div>
      </div>
      <div className="border-b border-white/10 p-4 sm:p-7">
        <div className="space-y-3">
          {[...displayedParticipants]
            .sort((a, b) => b.progress - a.progress)
            .map((participant, index) => (
              <div
                key={participant.userId}
                className={`grid grid-cols-[24px_minmax(72px,100px)_1fr_56px] items-center gap-2 rounded-[6px] px-2 py-2 font-mono text-[11px] sm:grid-cols-[25px_120px_1fr_64px_70px] sm:gap-3 ${participant.userId === viewerId ? "bg-white/5" : ""}`}
              >
                <span className="text-white/35">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={
                    participant.userId === viewerId
                      ? "text-flare"
                      : "text-white/70"
                  }
                >
                  {participant.username}
                  <small className="mt-1 block text-[9px] uppercase text-white/35">
                    {participant.raceStatus === "finished"
                      ? `FINISH #${participant.placement}`
                      : participant.raceStatus}
                  </small>
                </span>
                <div className="relative h-5 border-y border-dashed border-white/15">
                  <span
                    className={`race-marker ${participant.raceStatus === "finished" ? "bg-flare" : "bg-moss"}`}
                    style={{
                      transform: `translateX(calc(${participant.progress}% - 8px))`,
                    }}
                  />
                </div>
                <span className="text-right text-white/50">
                  {Math.round(participant.progress)}%
                </span>
                <span className="hidden text-right text-white/50 sm:block">
                  {Math.round(participant.wpm)} WPM
                </span>
              </div>
            ))}
        </div>
      </div>
      <div className="relative p-5 sm:p-8">
        {room.status === "countdown" && !typing.started && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink/95">
            <div className="text-center">
              <p className="font-mono text-7xl text-flare" aria-hidden="true">
                {countdown || "GO"}
              </p>
              <p className="sr-only" aria-live="polite">
                Balapan dimulai dalam {countdown} detik
              </p>
            </div>
          </div>
        )}
        {ownResult && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink/95 p-6 text-center">
            <div>
              <p className="eyebrow justify-center text-flare">
                Finis sementara
              </p>
              <p className="mt-5 font-mono text-6xl text-flare">
                #{ownResult.placement}
              </p>
              <p className="mt-4 text-lg">
                {Math.round(ownResult.wpm)} WPM ·{" "}
                {ownResult.accuracy.toFixed(1)}%
              </p>
              <p className="mt-2 text-sm text-white/50">
                Rating {ownResult.ratingChange >= 0 ? "+" : ""}
                {ownResult.ratingChange}. Menunggu pemain lain…
              </p>
            </div>
          </div>
        )}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs text-white/40">
              {room.text?.difficulty}
            </p>
            <h2 className="mt-1 font-bold">{room.text?.title}</h2>
          </div>
          <div className="font-mono text-sm">
            {Math.round(metrics.wpm)} WPM · {metrics.accuracy.toFixed(1)}%
          </div>
        </div>
        <div
          className="relative min-h-48 rounded-[7px] border border-white/10 bg-black/15 p-5 font-mono text-[clamp(1rem,2vw,1.3rem)] leading-[1.9]"
          role="application"
          aria-label="Area balapan"
          data-target-text={typing.content}
          onClick={() => inputRef.current?.focus()}
        >
          {typing.content.split("").map((character, index) => (
            <span
              key={`${index}-${character}`}
              className={
                index < typing.currentCharacter
                  ? "text-[#92b6a3]"
                  : index === typing.currentCharacter
                    ? typing.errorCharacter
                      ? "bg-danger text-white"
                      : "border-l-2 border-flare text-white"
                    : "text-white/35"
              }
            >
              {character}
            </span>
          ))}
          <TypingCapture
            inputRef={inputRef}
            active={activeRace && typing.started && !typing.finished}
            label="Input balapan"
            onType={(value) => {
              for (const character of value) {
                dispatch({ type: "TYPE", character });
              }
            }}
            onBackspace={() => dispatch({ type: "BACKSPACE" })}
            onBlockedInput={(kind) => {
              appendIntegrityEvent(integrityEventsRef, kind);
              if (kind === "paste" || kind === "insertFromPaste") {
                setMessage(
                  "Paste diblokir dan dicatat pada pemeriksaan hasil.",
                );
              }
            }}
          />
        </div>
        <p className="mt-3 text-xs text-white/45">
          Di HP, ketuk area teks untuk membuka keyboard.
        </p>
        {message && (
          <p role="status" className="mt-4 text-sm text-flare">
            {message}
          </p>
        )}
        {typing.finished && !ownResult && (
          <Button
            onClick={() => void finishRace()}
            disabled={finishPending}
            className="mt-4"
          >
            {finishPending ? "Menyimpan hasil..." : "Coba simpan hasil lagi"}
          </Button>
        )}
        <Button
          onClick={() => {
            setLeaveError("");
            setLeaveOpen(true);
          }}
          variant="quiet"
          className="mt-5 border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <LogOut size={15} /> Keluar dari race
        </Button>
      </div>
      {leaveConfirmation}
    </section>
  );
}

function ConnectionBadge({
  state,
  dark = false,
}: {
  state: ConnectionState;
  dark?: boolean;
}) {
  const online = state === "online";
  const label =
    state === "reconnecting"
      ? "menyambung ulang"
      : state === "connecting"
        ? "menghubungkan"
        : state;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${online ? "text-moss" : dark ? "text-flare" : "text-danger"}`}
    >
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      {label}
    </span>
  );
}

function HostSettings({
  room,
  categories,
  onSaved,
}: {
  room: RaceRoomView;
  categories: { id: string; name: string }[];
  onSaved: (room: Partial<RaceRoomView>) => void;
}) {
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const payload = {
      name: values.get("name"),
      maxPlayers: Number(values.get("maxPlayers")),
      difficulty: values.get("difficulty") || null,
      categoryId: values.get("categoryId") || null,
    };
    const response = await fetch(`/api/races/${room.id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setMessage(result.message);
    if (result.success) {
      onSaved({
        name: result.data.name,
        visibility: result.data.visibility,
        maxPlayers: result.data.max_players,
        difficulty: result.data.difficulty,
        categoryId: result.data.category_id,
      });
    }
  }
  return (
    <details className="panel p-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
        <Settings2 size={17} /> Pengaturan host
      </summary>
      <form onSubmit={save} className="mt-5 space-y-4">
        <label>
          <span className="label">Nama</span>
          <input
            name="name"
            className="field"
            defaultValue={room.name}
            required
          />
        </label>
        <div>
          <span className="label">Akses</span>
          <div className="rounded-[7px] border border-line bg-sand px-4 py-3 text-sm font-bold">
            {room.visibility === "private"
              ? "Private — dengan kode"
              : "Public — Quick Race"}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            Jenis akses tidak dapat diubah setelah room dibuat.
          </p>
        </div>
        <label>
          <span className="label">Maksimal pemain</span>
          <select
            name="maxPlayers"
            className="field"
            defaultValue={room.maxPlayers}
          >
            {[2, 3, 4, 5, 6, 7, 8].map((count) => (
              <option key={count}>{count}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Kesulitan</span>
          <select
            name="difficulty"
            className="field"
            defaultValue={room.difficulty ?? ""}
          >
            <option value="">Acak</option>
            <option value="easy">Mudah</option>
            <option value="medium">Menengah</option>
            <option value="hard">Sulit</option>
          </select>
        </label>
        <label>
          <span className="label">Kategori</span>
          <select
            name="categoryId"
            className="field"
            defaultValue={room.categoryId ?? ""}
          >
            <option value="">Semua</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="quiet" className="w-full">
          Simpan
        </Button>
        {message && <p className="text-xs text-muted">{message}</p>}
      </form>
    </details>
  );
}
