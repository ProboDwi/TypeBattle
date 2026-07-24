import { getRaceMarkerLeft } from "@/lib/race/progress";

const racers = [
  { number: "01", name: "ANDA", progress: 72, accent: true },
  { number: "02", name: "RANI_17", progress: 58, accent: false },
  { number: "03", name: "BIMA.K", progress: 41, accent: false },
];

export function RaceDemo() {
  return (
    <div className="race-demo" aria-label="Simulasi jalur balapan mengetik">
      <div className="mb-7 flex items-center justify-between border-b border-white/15 pb-4">
        <span className="font-mono text-xs tracking-[0.2em] text-white/55">
          RUANG A7K2MN
        </span>
        <span className="status-dot">LIVE</span>
      </div>
      <div className="space-y-5">
        {racers.map((racer) => (
          <div
            key={racer.number}
            className="grid grid-cols-[24px_82px_1fr_42px] items-center gap-3 font-mono text-xs"
          >
            <span className="text-white/35">{racer.number}</span>
            <span className={racer.accent ? "text-flare" : "text-white/75"}>
              {racer.name}
            </span>
            <div className="relative h-5 border-y border-dashed border-white/20">
              <span className="absolute -right-1 top-[-5px] text-[9px] text-white/35">
                FIN
              </span>
              <span
                className={
                  racer.accent ? "race-marker bg-flare" : "race-marker bg-moss"
                }
                style={{
                  left: getRaceMarkerLeft(racer.progress),
                }}
              />
            </div>
            <span className="text-right text-white/60">{racer.progress}%</span>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-[6px] bg-white/5 p-4 font-mono text-[15px] leading-7">
        <span className="text-white/40">Ritme tumbuh dari </span>
        <span className="bg-flare px-0.5 text-white">latihan</span>
        <span className="border-l-2 border-white pl-0.5 text-white">
          {" "}
          yang konsisten.
        </span>
      </div>
    </div>
  );
}
