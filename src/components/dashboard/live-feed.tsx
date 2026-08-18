import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { employees } from "@/lib/workforce-data";

type Event = { id: number; text: string; time: string; kind: "in" | "out" | "sync" };

const templates: ((name: string, site: string) => Event["kind"] | null)[] = [];
void templates;

function makeEvent(seq: number): Event {
  const e = employees[seq % employees.length]!;
  const kinds: Event["kind"][] = ["in", "out", "sync"];
  const kind = kinds[seq % 3]!;
  const text =
    kind === "in"
      ? `${e.name} clocked in at ${e.site} — geofence verified`
      : kind === "out"
        ? `${e.name} clocked out — ${e.hoursToday.toFixed(1)}h logged`
        : `Offline scan from ${e.site} synced (${e.id})`;
  return {
    id: seq,
    kind,
    text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

export function LiveFeed() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let seq = 0;
    setEvents([makeEvent(seq++), makeEvent(seq++), makeEvent(seq++)]);
    const t = setInterval(() => {
      setEvents((prev) => [makeEvent(seq++), ...prev].slice(0, 8));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="panel flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">Live event stream</h2>
        <Radio className="ml-auto size-4 text-muted-foreground" />
      </div>
      <ul className="mt-4 space-y-2.5">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-3 text-xs">
            <span className="tabular shrink-0 text-muted-foreground">{e.time}</span>
            <span className="leading-relaxed">{e.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-auto pt-4 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        Realtime channel · simulated until backend is connected
      </p>
    </div>
  );
}
