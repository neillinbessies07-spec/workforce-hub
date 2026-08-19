import { Link } from "@tanstack/react-router";
import { CalendarOff } from "lucide-react";
import {
  isoDate,
  leaveKindLabel,
  leaveStatusTone,
  selectLeave,
  useStore,
  type StoreState,
} from "@/lib/shiftops-store";

const selectPending = (s: StoreState) => selectLeave(s).filter((l) => l.status === "pending").length;

export function AbsencePanel() {
  const leave = useStore(selectLeave);
  const pending = useStore(selectPending);
  const today = isoDate(new Date());
  const outToday = leave.filter((l) => l.status === "approved" && l.from <= today && l.to >= today);
  const upcoming = leave.filter((l) => l.status === "approved" && l.from > today).slice(0, 4);

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <CalendarOff className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Absence &amp; leave</h2>
        <Link to="/leave" className="ml-auto text-xs text-primary hover:underline">
          Manage
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Out today</p>
          <p className="tabular mt-1 text-2xl font-semibold">{outToday.length}</p>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Awaiting approval</p>
          <p className="tabular mt-1 text-2xl font-semibold">{pending}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {outToday.length === 0 && upcoming.length === 0 && (
          <li className="text-xs text-muted-foreground">Full team available — nothing logged.</li>
        )}
        {[...outToday, ...upcoming].slice(0, 6).map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{l.name || l.personId}</span>
            <span className="text-xs text-muted-foreground">{leaveKindLabel[l.kind]}</span>
            <span className="tabular ml-auto text-xs text-muted-foreground">
              {l.from === l.to ? l.from : `${l.from} → ${l.to}`}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${leaveStatusTone[l.status]}`}>
              {l.from <= today && l.to >= today ? "out" : "planned"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
