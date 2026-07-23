"use client";

import { useEffect, useState } from "react";
import {
  formatDailyCountdown,
  millisecondsUntilNextJakartaDay,
} from "@/lib/daily/time";

export function DailyResetCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () =>
      setRemaining(millisecondsUntilNextJakartaDay(Date.now()));
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-[7px] border border-moss/30 bg-moss/5 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[.12em] text-moss">
        Tantangan berikutnya
      </p>
      <p className="mt-2 font-mono text-2xl font-bold" aria-live="off">
        {remaining === null ? "--:--:--" : formatDailyCountdown(remaining)}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">
        Berganti pukul 00.00 WIB. Hanya hasil resmi pertama setiap hari yang
        masuk papan peringkat.
      </p>
    </div>
  );
}
