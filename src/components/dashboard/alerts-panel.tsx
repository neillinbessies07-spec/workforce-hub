import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { alerts } from "@/lib/workforce-data";
import { cn } from "@/lib/utils";

const icons = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
} as const;

export function AlertsPanel() {
  return (
    <div className="panel flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">Automated alerts</h2>
        <span className="tabular rounded-md bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
          {alerts.filter((a) => a.severity !== "info").length} open
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {alerts.map((a) => {
          const Icon = icons[a.severity];
          return (
            <li key={a.id} className="rounded-lg border border-border/70 bg-secondary/30 p-3">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 rounded-md p-1.5",
                    a.severity === "critical" && "bg-destructive/15 text-destructive",
                    a.severity === "warning" && "bg-warning/15 text-warning",
                    a.severity === "info" && "bg-primary/15 text-primary",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{a.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {a.time}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
