import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { formatDuration, formatNumber } from "@/lib/utils/format";

export interface RaceResultView {
  userId: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  placement: number | null;
  wpm: number | null;
  accuracy: number | null;
  errors: number | null;
  durationMs: number | null;
  ratingChange: number | null;
  status: string;
}

export function RaceResults({
  roomName,
  code,
  results,
}: {
  roomName: string;
  code: string;
  results: RaceResultView[];
}) {
  const sorted = [...results].sort(
    (a, b) => (a.placement ?? 99) - (b.placement ?? 99),
  );
  const podium = sorted.filter((item) => item.placement && item.placement <= 3);
  return (
    <div>
      <section className="rounded-[9px] border border-[#303238] bg-ink p-6 text-paper sm:p-9">
        <p className="eyebrow text-flare">Race finished / {code}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-.05em]">
          {roomName}
        </h1>
        <div className="mt-10 grid items-end gap-3 sm:grid-cols-3">
          {podium.map((item) => (
            <div
              key={item.userId}
              className={`border border-white/10 bg-white/5 p-5 text-center ${item.placement === 1 ? "sm:-mt-5 sm:pb-10 sm:pt-8" : ""}`}
            >
              <span className="font-mono text-3xl text-flare">
                #{item.placement}
              </span>
              <Avatar
                seed={item.avatarSeed}
                label={item.displayName}
                className="mx-auto mt-4 size-12"
              />
              <p className="mt-3 font-bold">{item.displayName}</p>
              <p className="mt-1 font-mono text-xs text-white/45">
                @{item.username}
              </p>
              <p className="mt-4 font-mono text-lg">
                {Math.round(item.wpm ?? 0)} WPM
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line bg-sand font-mono text-[10px] uppercase tracking-[.12em] text-muted">
              <tr>
                <th className="px-5 py-4">Posisi</th>
                <th className="px-5 py-4">Pemain</th>
                <th className="px-5 py-4">WPM</th>
                <th className="px-5 py-4">Akurasi</th>
                <th className="px-5 py-4">Errors</th>
                <th className="px-5 py-4">Durasi</th>
                <th className="px-5 py-4">Rating</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr
                  key={item.userId}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-5 py-4 font-mono text-lg">
                    {item.placement ? `#${item.placement}` : "DNF"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        seed={item.avatarSeed}
                        label={item.displayName}
                        className="size-8"
                      />
                      <div>
                        <p className="font-bold">{item.displayName}</p>
                        <p className="font-mono text-xs text-muted">
                          @{item.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono">
                    {item.wpm === null ? "—" : Math.round(item.wpm)}
                  </td>
                  <td className="px-5 py-4 font-mono">
                    {item.accuracy === null
                      ? "—"
                      : `${formatNumber(item.accuracy)}%`}
                  </td>
                  <td className="px-5 py-4 font-mono">{item.errors ?? "—"}</td>
                  <td className="px-5 py-4 font-mono">
                    {item.durationMs === null
                      ? "—"
                      : formatDuration(item.durationMs)}
                  </td>
                  <td
                    className={`px-5 py-4 font-mono ${(item.ratingChange ?? 0) >= 0 ? "text-moss" : "text-danger"}`}
                  >
                    {item.ratingChange === null
                      ? "—"
                      : `${item.ratingChange >= 0 ? "+" : ""}${item.ratingChange}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/race">Main lagi</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">
          Dashboard
        </ButtonLink>
        <ButtonLink href="/race/create" variant="quiet">
          Buat room baru
        </ButtonLink>
      </div>
    </div>
  );
}
