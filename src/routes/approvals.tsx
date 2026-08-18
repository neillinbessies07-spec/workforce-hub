import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, MapPin, ShieldQuestion, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  reviewPunch,
  statusTone,
  useStore,
  type PunchStatus,
  type StoreState,
} from "@/lib/shiftops-store";

const title = "ShiftOps — Clock-in Approvals";
const description =
  "Managers review every clock-in and clock-out: verified location, sync state and a one-tap approve or reject decision.";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApprovalsPage,
});

const selectPunches = (s: StoreState) => s.punches;

const filters: { key: PunchStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function ApprovalsPage() {
  const punches = useStore(selectPunches);
  const [filter, setFilter] = useState<PunchStatus | "all">("pending");

  const rows = punches.filter((p) => filter === "all" || p.status === filter);
  const pending = punches.filter((p) => p.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Compliance</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Clock-in approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pending} punch{pending === 1 ? "" : "es"} awaiting a manager decision.
        </p>
      </header>

      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "secondary"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  <ShieldQuestion className="mx-auto mb-2 size-5 text-muted-foreground/70" />
                  No punches in this view. Scans made on the clock-in kiosk land here.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="tabular text-xs text-muted-foreground">{p.badge}</div>
                </td>
                <td className="px-4 py-3 capitalize">Clock {p.direction}</td>
                <td className="tabular px-4 py-3 text-muted-foreground">
                  {new Date(p.at).toLocaleString([], {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.lat != null && p.lng != null ? (
                    <span className="tabular inline-flex items-center gap-1">
                      <MapPin className="size-3.5 text-primary" />
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-warning">Unverified</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] capitalize",
                      statusTone[p.status],
                    )}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={p.status === "approved"}
                      onClick={() => {
                        reviewPunch(p.id, "approved");
                        toast.success(`Approved ${p.name}`);
                      }}
                    >
                      <Check /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={p.status === "rejected"}
                      onClick={() => {
                        reviewPunch(p.id, "rejected");
                        toast.error(`Rejected ${p.name}`);
                      }}
                    >
                      <X /> Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
