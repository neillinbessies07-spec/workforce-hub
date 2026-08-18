import { MapPin, MapPinOff } from "lucide-react";
import { employees, OVERTIME_THRESHOLD, statusLabel, type ClockStatus } from "@/lib/workforce-data";
import { cn } from "@/lib/utils";

const statusStyle: Record<ClockStatus, string> = {
  in: "bg-primary/15 text-primary",
  out: "bg-secondary text-muted-foreground",
  break: "bg-chart-2/15 text-chart-2",
  late: "bg-warning/15 text-warning",
  absent: "bg-destructive/15 text-destructive",
};

export function RosterTable() {
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">Live roster</h2>
          <p className="mt-1 text-xs text-muted-foreground">Today · verified clock events</p>
        </div>
        <span className="tabular text-xs text-muted-foreground">{employees.length} staff</span>
      </div>

      <div className="mt-4 space-y-2 lg:hidden">
        {employees.map((e) => (
          <div key={e.id} className="rounded-lg border border-border/70 bg-secondary/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.role} · {e.site}
                </p>
              </div>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px]", statusStyle[e.status])}>
                {statusLabel[e.status]}
              </span>
            </div>
            <div className="tabular mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>In {e.clockIn ?? "—"}</span>
              <span>Today {e.hoursToday.toFixed(1)}h</span>
              <span className={cn(e.weekHours > OVERTIME_THRESHOLD && "text-warning")}>
                Week {e.weekHours.toFixed(1)}h
              </span>
              <span className={cn("flex items-center gap-1", !e.locationVerified && "text-destructive")}>
                {e.locationVerified ? <MapPin className="size-3" /> : <MapPinOff className="size-3" />}
                {e.locationVerified ? "Geo ok" : "Mismatch"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 font-medium">Employee</th>
              <th className="pb-2 font-medium">Site</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 text-right font-medium">In / Out</th>
              <th className="pb-2 text-right font-medium">Today</th>
              <th className="pb-2 text-right font-medium">Week</th>
              <th className="pb-2 text-right font-medium">Cost</th>
              <th className="pb-2 text-right font-medium">Geo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {employees.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-secondary/30">
                <td className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-primary">
                      {e.initials}
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.role}</p>
                    </div>
                  </div>
                </td>
                <td className="text-xs text-muted-foreground">{e.site}</td>
                <td>
                  <span className={cn("rounded-md px-2 py-0.5 text-[11px]", statusStyle[e.status])}>
                    {statusLabel[e.status]}
                  </span>
                </td>
                <td className="tabular text-right text-xs text-muted-foreground">
                  {e.clockIn ?? "—"} / {e.clockOut ?? "—"}
                </td>
                <td className="tabular text-right">{e.hoursToday.toFixed(1)}h</td>
                <td
                  className={cn(
                    "tabular text-right",
                    e.weekHours > OVERTIME_THRESHOLD && "font-semibold text-warning",
                  )}
                >
                  {e.weekHours.toFixed(1)}h
                </td>
                <td className="tabular text-right">R{Math.round(e.weekHours * e.hourlyRate).toLocaleString()}</td>
                <td className="text-right">
                  {e.locationVerified ? (
                    <MapPin className="ml-auto size-4 text-primary" />
                  ) : (
                    <MapPinOff className="ml-auto size-4 text-destructive" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
