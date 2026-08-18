import { days, heatmap, hours } from "@/lib/workforce-data";

const max = Math.max(...heatmap.flat());

export function OccupancyHeatmap() {
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">Peak operational hours</h2>
          <p className="mt-1 text-xs text-muted-foreground">Staff on the floor, last 7 days</p>
        </div>
        <div className="hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex">
          <span>low</span>
          <span className="h-2 w-20 rounded-full bg-gradient-to-r from-secondary to-primary" />
          <span>peak</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[420px]">
          <div className="grid grid-cols-[2.2rem_repeat(9,minmax(0,1fr))] gap-1">
            <div />
            {hours.map((h) => (
              <div key={h} className="tabular text-center text-[10px] text-muted-foreground">
                {h}
              </div>
            ))}
            {days.map((d, di) => (
              <Row key={d} day={d} values={heatmap[di]!} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ day, values }: { day: string; values: number[] }) {
  return (
    <>
      <div className="flex items-center text-[11px] text-muted-foreground">{day}</div>
      {values.map((v, i) => (
        <div
          key={i}
          title={`${day} ${hours[i]}:00 — ${v} staff`}
          className="aspect-square rounded-[4px] border border-border/40 transition-transform hover:scale-110"
          style={{
            backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round((v / max) * 100)}%, var(--secondary))`,
          }}
        />
      ))}
    </>
  );
}
