"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ArrowLeft, Clipboard, Focus, RotateCcw, Share2 } from "lucide-react";
import { DailyResetCountdown } from "@/components/game/daily-reset-countdown";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  createTypingState,
  getTypingMetrics,
  typingReducer,
} from "@/lib/typing/engine";
import { calculateAccuracy, calculateWpm } from "@/lib/typing/metrics";
import { formatDuration } from "@/lib/utils/format";
import type { Difficulty, PracticeMode } from "@/types/app";

interface CategoryOption {
  id: string;
  name: string;
}
interface ActiveSession {
  sessionId: string | null;
  text: {
    id: string;
    title: string;
    content: string;
    difficulty: Difficulty;
    categoryName: string;
  };
  startedAt: string;
  guest: boolean;
}
interface ResultData {
  wpm: number;
  accuracy: number;
  durationMs: number;
  errors: number;
  experienceGained: number;
  personalBest: boolean;
  suspicious: boolean;
  storage: "official" | "guest-local" | "unsaved";
  saveError: string;
  averageDelta: number;
  newAchievements: { code: string; name: string }[];
}

const modeOptions: { value: PracticeMode; label: string; detail: string }[] = [
  { value: "quote", label: "Kutipan acak", detail: "Selesaikan seluruh teks" },
  { value: "timed_30", label: "30 detik", detail: "Sprint singkat" },
  { value: "timed_60", label: "60 detik", detail: "Uji konsistensi" },
  {
    value: "daily",
    label: "Tantangan harian",
    detail: "Hasil resmi pertama dicatat",
  },
];

export function PracticeGame({
  categories,
  initialMode = "quote",
}: {
  categories: CategoryOption[];
  initialMode?: PracticeMode;
}) {
  const [phase, setPhase] = useState<
    "setup" | "loading" | "countdown" | "typing" | "result"
  >("setup");
  const [mode, setMode] = useState<PracticeMode>(initialMode);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [typing, dispatch] = useReducer(typingReducer, createTypingState(""));
  const typingRef = useRef(typing);
  const [remaining, setRemaining] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startPerformanceRef = useRef(0);
  const focusLossesRef = useRef(0);
  const integrityEventsRef = useRef<string[]>([]);
  const finishingRef = useRef(false);
  const composingRef = useRef(false);

  useEffect(() => {
    typingRef.current = typing;
  }, [typing]);

  const metrics = useMemo(
    () => getTypingMetrics(typing, elapsedMs),
    [typing, elapsedMs],
  );
  const timedLimit =
    mode === "timed_30" ? 30_000 : mode === "timed_60" ? 60_000 : null;

  const focusInput = useCallback(
    () => inputRef.current?.focus({ preventScroll: true }),
    [],
  );

  const startPractice = useCallback(async () => {
    setPhase("loading");
    setNotice("");
    setResult(null);
    focusLossesRef.current = 0;
    integrityEventsRef.current = [];
    finishingRef.current = false;
    try {
      const previousTextId =
        session?.text.id ??
        window.localStorage.getItem("keylane:last-practice-text");
      const response = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          difficulty: difficulty || null,
          categoryId: categoryId || null,
          excludeTextId: mode === "daily" ? null : previousTextId,
        }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message);
      window.localStorage.setItem(
        "keylane:last-practice-text",
        payload.data.text.id,
      );
      setSession(payload.data);
      dispatch({ type: "RESET", content: payload.data.text.content });
      setRemaining(
        Math.max(
          0,
          Math.ceil(
            (new Date(payload.data.startedAt).getTime() - Date.now()) / 1000,
          ),
        ),
      );
      setElapsedMs(0);
      setPhase("countdown");
      if (payload.data.guest && payload.message) setNotice(payload.message);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Latihan belum dapat dimulai.",
      );
      setPhase("setup");
    }
  }, [categoryId, difficulty, mode, session]);

  const finishPractice = useCallback(async () => {
    if (finishingRef.current || !session) return;
    finishingRef.current = true;
    const finalState = typingRef.current;
    const clientDurationMs = Math.max(
      1,
      Math.round(performance.now() - startPerformanceRef.current),
    );
    const localResult: ResultData = {
      wpm: calculateWpm(finalState.correctCharacters, clientDurationMs),
      accuracy: calculateAccuracy(
        finalState.totalKeystrokes - finalState.incorrectKeystrokes,
        finalState.totalKeystrokes,
      ),
      durationMs: clientDurationMs,
      errors: finalState.incorrectKeystrokes,
      experienceGained: 0,
      personalBest: false,
      suspicious: integrityEventsRef.current.length > 0,
      storage: session.sessionId ? "unsaved" : "guest-local",
      saveError: "",
      averageDelta: 0,
      newAchievements: [],
    };
    if (!session.sessionId) {
      const previous = JSON.parse(
        localStorage.getItem("keylane:guest-results") ?? "[]",
      ) as ResultData[];
      localStorage.setItem(
        "keylane:guest-results",
        JSON.stringify([localResult, ...previous].slice(0, 20)),
      );
      setResult(localResult);
      setPhase("result");
      return;
    }
    try {
      const response = await fetch(
        `/api/practice/${session.sessionId}/finish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentCharacter: finalState.currentCharacter,
            incorrectKeystrokes: finalState.incorrectKeystrokes,
            totalKeystrokes: finalState.totalKeystrokes,
            clientDurationMs,
            focusLosses: focusLossesRef.current,
            integrityEvents: integrityEventsRef.current,
          }),
        },
      );
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message);
      setResult({
        wpm: Number(payload.data.wpm),
        accuracy: Number(payload.data.accuracy),
        durationMs: Number(payload.data.durationMs),
        errors: finalState.incorrectKeystrokes,
        experienceGained: Number(payload.data.experienceGained ?? 0),
        personalBest: Boolean(payload.data.personalBest),
        suspicious: Boolean(payload.data.suspicious),
        storage: "official",
        saveError: "",
        averageDelta: Number(payload.data.averageDelta ?? 0),
        newAchievements: Array.isArray(payload.data.newAchievements)
          ? payload.data.newAchievements
          : [],
      });
      setPhase("result");
    } catch (error) {
      const saveError =
        error instanceof Error ? error.message : "Hasil belum dapat disimpan.";
      setNotice("");
      setResult({ ...localResult, storage: "unsaved", saveError });
      setPhase("result");
    }
  }, [session]);

  useEffect(() => {
    if (phase !== "countdown" || !session) return;
    const startAt = new Date(session.startedAt).getTime();
    const tick = () => {
      const difference = startAt - Date.now();
      setRemaining(Math.max(0, Math.ceil(difference / 1000)));
      if (difference <= 0) {
        startPerformanceRef.current =
          performance.now() + Math.min(0, difference);
        dispatch({ type: "START" });
        setPhase("typing");
        requestAnimationFrame(focusInput);
      }
    };
    tick();
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [focusInput, phase, session]);

  useEffect(() => {
    if (phase !== "typing") return;
    const tick = () =>
      setElapsedMs(
        Math.max(0, performance.now() - startPerformanceRef.current),
      );
    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (
      phase === "typing" &&
      (typing.finished || (timedLimit !== null && elapsedMs >= timedLimit))
    ) {
      void finishPractice();
    }
  }, [elapsedMs, finishPractice, phase, timedLimit, typing.finished]);

  useEffect(() => {
    const recordVisibility = () => {
      if (document.hidden && phase === "typing") focusLossesRef.current += 1;
    };
    document.addEventListener("visibilitychange", recordVisibility);
    return () =>
      document.removeEventListener("visibilitychange", recordVisibility);
  }, [phase]);

  function typeCharacters(value: string) {
    for (const character of value) dispatch({ type: "TYPE", character });
  }

  async function shareResult() {
    if (!result) return;
    const summary = `Keylane — ${Math.round(result.wpm)} WPM · ${result.accuracy.toFixed(1)}% akurasi · ${result.errors} kesalahan`;
    if (navigator.share)
      await navigator.share({
        title: "Hasil Keylane",
        text: summary,
        url: window.location.origin,
      });
    else {
      await navigator.clipboard.writeText(summary);
      setNotice("Ringkasan hasil disalin.");
    }
  }

  function returnToPracticeMenu() {
    setPhase("setup");
    setSession(null);
    setResult(null);
    setNotice("");
    setRemaining(3);
    setElapsedMs(0);
    finishingRef.current = false;
    focusLossesRef.current = 0;
    integrityEventsRef.current = [];
    dispatch({ type: "RESET", content: "" });
  }

  if (phase === "setup" || phase === "loading") {
    return (
      <section className="panel overflow-hidden">
        <div className="border-b border-line p-6 sm:p-8">
          <p className="eyebrow">Konfigurasi sesi</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Pilih ritme latihan.
          </h2>
        </div>
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_.55fr]">
          <div>
            <p className="label">Mode</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {modeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`rounded-[8px] border p-4 text-left ${mode === option.value ? "border-accent bg-accent/5" : "border-line bg-paper hover:border-ink"}`}
                >
                  <span className="block font-bold">{option.label}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {option.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="difficulty">
                Tingkat kesulitan
              </label>
              <select
                id="difficulty"
                className="field"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as Difficulty | "")
                }
              >
                <option value="">Semua tingkat</option>
                <option value="easy">Mudah</option>
                <option value="medium">Menengah</option>
                <option value="hard">Sulit</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="category">
                Kategori
              </label>
              <select
                id="category"
                className="field"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Semua kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={startPractice}
              disabled={phase === "loading"}
              className="w-full"
            >
              {phase === "loading" ? "Menyiapkan lintasan…" : "Mulai latihan"}
            </Button>
            {mode === "daily" && <DailyResetCountdown />}
            {notice && (
              <p role="status" className="text-sm leading-6 text-muted">
                {notice}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="panel overflow-hidden">
        <div className="border-b border-line bg-ink p-7 text-paper sm:p-10">
          <p className="eyebrow text-flare">Sesi selesai</p>
          <div className="mt-8 grid grid-cols-2 gap-7 sm:grid-cols-4">
            <ResultStat
              label="Kecepatan"
              value={`${Math.round(result.wpm)}`}
              unit="WPM"
            />
            <ResultStat
              label="Akurasi"
              value={result.accuracy.toFixed(1)}
              unit="%"
            />
            <ResultStat
              label="Durasi"
              value={formatDuration(result.durationMs)}
            />
            <ResultStat label="Kesalahan" value={String(result.errors)} />
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {result.personalBest && (
              <p className="rounded-[7px] border border-flare/30 bg-flare/5 p-4 font-bold text-accent">
                Personal best baru.
              </p>
            )}
            {result.experienceGained > 0 && (
              <p className="rounded-[7px] border border-moss/30 bg-moss/5 p-4 font-bold text-moss">
                +{result.experienceGained} XP diperoleh.
              </p>
            )}
            {result.storage === "official" && (
              <p className="rounded-[7px] border border-line bg-paper p-4 text-sm text-muted">
                {result.averageDelta >= 0 ? "+" : ""}
                {result.averageDelta.toFixed(1)} WPM dibanding rata-rata
                sebelumnya.
              </p>
            )}
            {result.newAchievements.map((achievement) => (
              <p
                key={achievement.code}
                className="rounded-[7px] border border-flare/30 bg-flare/5 p-4 font-bold text-accent"
              >
                Achievement terbuka: {achievement.name}
              </p>
            ))}
            {result.storage === "official" && (
              <p className="rounded-[7px] border border-moss/30 bg-moss/5 p-4 text-sm font-bold text-moss">
                Hasil resmi tersimpan ke akun dan sudah tersedia di dashboard.
              </p>
            )}
            {result.storage === "guest-local" && (
              <p className="rounded-[7px] border border-line bg-sand p-4 text-sm text-muted">
                Hasil tamu tersimpan di perangkat ini dan tidak masuk
                leaderboard.
              </p>
            )}
            {result.storage === "unsaved" && (
              <div className="rounded-[7px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger sm:col-span-2">
                <p className="font-bold">
                  Hasil belum tersimpan ke akun atau dashboard.
                </p>
                <p className="mt-1 leading-6">
                  Statistik di atas hanya perhitungan sementara dari browser.{" "}
                  {result.saveError}
                </p>
              </div>
            )}
            {result.suspicious && result.storage === "official" && (
              <p className="rounded-[7px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                Hasil ditandai untuk pemeriksaan dan tidak memengaruhi
                peringkat.
              </p>
            )}
          </div>
          {notice && (
            <p role="status" className="mt-4 text-sm text-muted">
              {notice}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={startPractice}>
              <RotateCcw size={16} /> Ulangi
            </Button>
            <Button onClick={startPractice} variant="quiet">
              Teks berikutnya
            </Button>
            <Button onClick={returnToPracticeMenu} variant="quiet">
              <ArrowLeft size={16} /> Kembali ke menu latihan
            </Button>
            <Button onClick={() => void shareResult()} variant="quiet">
              <Share2 size={16} /> Bagikan
            </Button>
            <ButtonLink href="/dashboard" variant="secondary">
              Ke dashboard
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[9px] border border-[#303238] bg-ink text-paper">
      <div className="grid gap-px border-b border-white/10 bg-white/10 sm:grid-cols-5">
        <GameStat
          label="Mode"
          value={mode
            .replace("timed_", "")
            .replace("quote", "Kutipan")
            .replace("daily", "Harian")}
        />
        <GameStat label="WPM" value={String(Math.round(metrics.wpm))} />
        <GameStat label="Akurasi" value={`${metrics.accuracy.toFixed(1)}%`} />
        <GameStat
          label="Kesalahan"
          value={String(typing.incorrectKeystrokes)}
        />
        <GameStat
          label="Waktu"
          value={formatDuration(
            timedLimit ? Math.max(0, timedLimit - elapsedMs) : elapsedMs,
          )}
        />
      </div>
      <div className="p-5 sm:p-8" onClick={focusInput}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.14em] text-white/40">
              {session?.text.categoryName} / {session?.text.difficulty}
            </p>
            <h2 className="mt-2 text-xl font-bold">{session?.text.title}</h2>
          </div>
          <Button
            onClick={focusInput}
            variant="quiet"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <Focus size={16} /> Kembalikan fokus
          </Button>
        </div>
        <div className="mt-6 h-1 overflow-hidden bg-white/10">
          <div
            className="h-full bg-flare transition-[width] duration-150"
            style={{ width: `${metrics.progress}%` }}
          />
        </div>
        <div
          className="relative mt-8 min-h-52 rounded-[7px] border border-white/10 bg-black/15 p-5 font-mono text-[clamp(1.05rem,2.2vw,1.45rem)] leading-[1.9] sm:p-7"
          role="application"
          aria-label="Area mengetik"
          data-target-text={typing.content}
          tabIndex={-1}
        >
          {phase === "countdown" && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-ink/95">
              <div className="text-center">
                <p
                  className="font-mono text-7xl font-bold text-flare"
                  aria-hidden="true"
                >
                  {remaining || "GO"}
                </p>
                <p className="sr-only" aria-live="polite">
                  Permainan dimulai dalam {remaining} detik
                </p>
                <p className="mt-3 text-sm text-white/50">
                  Siapkan jari di baris utama
                </p>
              </div>
            </div>
          )}
          {typing.content.split("").map((character, index) => {
            const className =
              index < typing.currentCharacter
                ? "text-[#92b6a3]"
                : index === typing.currentCharacter
                  ? typing.errorCharacter
                    ? "bg-danger text-white"
                    : "border-l-2 border-flare bg-white/5 text-white"
                  : "text-white/38";
            return (
              <span key={`${index}-${character}`} className={className}>
                {character}
              </span>
            );
          })}
          <textarea
            ref={inputRef}
            value=""
            onChange={() => undefined}
            className="fixed left-[-9999px] top-auto h-px w-px opacity-0"
            aria-label="Input teks permainan"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            onKeyDown={(event) => {
              if (event.key === "Backspace") {
                event.preventDefault();
                dispatch({ type: "BACKSPACE" });
                return;
              }
              if (
                phase === "typing" &&
                !composingRef.current &&
                event.key.length === 1 &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
              ) {
                event.preventDefault();
                typeCharacters(event.key);
              }
            }}
            onBeforeInput={(event) => {
              if (phase !== "typing" || composingRef.current)
                return event.preventDefault();
              const inputEvent = event.nativeEvent as InputEvent;
              if (inputEvent.inputType !== "insertText" || !inputEvent.data) {
                integrityEventsRef.current.push(
                  `input:${inputEvent.inputType}`,
                );
                return event.preventDefault();
              }
              event.preventDefault();
              typeCharacters(inputEvent.data);
            }}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              if (phase === "typing") typeCharacters(event.data);
            }}
            onPaste={(event) => {
              event.preventDefault();
              integrityEventsRef.current.push("paste");
              setNotice("Paste diblokir untuk menjaga hasil tetap adil.");
            }}
            onDrop={(event) => {
              event.preventDefault();
              integrityEventsRef.current.push("drop");
            }}
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
          <p>
            Klik area teks atau tekan tombol fokus. Kesalahan harus dihapus
            dengan Backspace.
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("setup");
              dispatch({ type: "RESET", content: "" });
            }}
            className="inline-flex items-center gap-2 font-bold text-white/70 hover:text-white"
          >
            <ArrowLeft size={14} /> Batalkan sesi
          </button>
        </div>
        {notice && (
          <p
            role="status"
            className="mt-4 inline-flex items-center gap-2 text-sm text-flare"
          >
            <Clipboard size={15} /> {notice}
          </p>
        )}
      </div>
    </section>
  );
}

function GameStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/35">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg text-white">{value}</p>
    </div>
  );
}

function ResultStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/40">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl text-flare">
        {value} {unit && <span className="text-xs text-white/45">{unit}</span>}
      </p>
    </div>
  );
}
