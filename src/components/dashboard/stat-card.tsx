import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  hint?: string;
};

export function StatCard({ label, value, delta, trend = "flat", icon: Icon, hint }: Props) {
  return (
    <div className="panel relative overflow-hidden p-4 sm:p-5">
      <div className="grid-scan pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="tabular mt-2 text-2xl font-semibold sm:text-3xl">{value}</p>
        </div>
        <span className="rounded-lg bg-secondary/70 p-2 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <div className="relative mt-3 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              "tabular rounded-md px-1.5 py-0.5 font-medium",
              trend === "up" && "bg-primary/15 text-primary",
              trend === "down" && "bg-destructive/15 text-destructive",
              trend === "flat" && "bg-secondary text-muted-foreground",
            )}
          >
            {delta}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
