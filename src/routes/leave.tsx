import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarOff, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  currentAccount,
  deleteLeave,
  isoDate,
  leaveKindLabel,
  leaveStatusTone,
  peopleFrom,
  requestLeave,
  reviewLeave,
  selectLeave,
  useStore,
  type LeaveKind,
  type StoreState,
} from "@/lib/shiftops-store";

const title = "ShiftOps — Absence & Leave";
const description =
  "Log unplanned absences, request annual or sick leave, and let managers approve or reject time off for shift-based teams.";

export const Route = createFileRoute("/leave")({
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
  component: LeavePage,
});

const selectMe = (s: StoreState) => currentAccount(s);
const selectPeople = (s: StoreState) => peopleFrom(s);

const kinds: LeaveKind[] = ["annual", "sick", "family", "unpaid", "absent"];

function LeavePage() {
  const me = useStore(selectMe);
  const people = useStore(selectPeople);
  const leave = useStore(selectLeave);
  const isManager = Boolean(me?.isManager);

  const today = isoDate(new Date());
  const [personId, setPersonId] = useState("");
  const [kind, setKind] = useState<LeaveKind>("annual");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("");

  const visible = useMemo(
    () => (isManager ? leave : leave.filter((l) => l.personId === me?.id)),
    [isManager, leave, me?.id],
  );
  const pending = visible.filter((l) => l.status === "pending");
  const outToday = leave.filter((l) => l.status === "approved" && l.from <= today && l.to >= today);

  const targetId = isManager ? personId : me?.id ?? "";
  const targetName = isManager ? people.find((p) => p.id === personId)?.name ?? "" : me?.name ?? "";

  function submit() {
    if (!me) {
      toast.error("Sign in on the clock-in kiosk first");
      return;
    }
    const res = requestLeave({
      personId: targetId,
      name: targetName,
      kind,
      from,
      to,
      reason,
      loggedByManager: isManager,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setReason("");
    toast.success(isManager ? "Absence logged" : "Leave request submitted", {
      description: `${leaveKindLabel[kind]} · ${from} → ${to}`,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Availability</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Absence &amp; leave</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isManager
            ? "Log unplanned absences and review time-off requests from your team."
            : "Request time off — your manager approves or rejects it here."}
        </p>
      </header>

      {!me ? (
        <div className="panel p-6 text-sm text-muted-foreground">
          Sign in on the <span className="text-foreground">Clock in</span> page to request leave.
        </div>
      ) : (
        <div className="panel p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarOff className="size-4 text-primary" />
            {isManager ? "Log absence / leave" : "Request leave"}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {isManager && (
              <label className="text-xs text-muted-foreground">
                Employee
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="">Select…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.role}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs text-muted-foreground">
              Type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as LeaveKind)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {leaveKindLabel[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              From
              <Input type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-xs text-muted-foreground">
              To
              <Input type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="text-xs text-muted-foreground">
              Reason
              <Input
                className="mt-1"
                placeholder="Optional"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
          <Button className="mt-3" onClick={submit}>
            {isManager ? "Log entry" : "Submit request"}
          </Button>
        </div>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Tile label="Out today" value={String(outToday.length)} />
        <Tile label="Awaiting approval" value={String(pending.length)} />
        <Tile label="Records" value={String(visible.length)} />
      </section>

      <div className="panel mt-4 overflow-x-auto p-4">
        <div className="text-sm font-medium">{isManager ? "All leave records" : "My requests"}</div>
        {visible.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <table className="mt-3 w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Employee</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Dates</th>
                <th className="py-2 pr-3 font-medium">Reason</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visible.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-3 font-medium">{l.name || l.personId}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{leaveKindLabel[l.kind]}</td>
                  <td className="tabular py-2 pr-3 text-muted-foreground">
                    {l.from === l.to ? l.from : `${l.from} → ${l.to}`}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{l.reason || "—"}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${leaveStatusTone[l.status]}`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {isManager ? (
                      <div className="flex justify-end gap-1">
                        {l.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Approve leave for ${l.name}`}
                              onClick={() => {
                                reviewLeave(l.id, "approved");
                                toast.success("Leave approved");
                              }}
                            >
                              <Check />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Reject leave for ${l.name}`}
                              onClick={() => {
                                reviewLeave(l.id, "rejected");
                                toast.success("Leave rejected");
                              }}
                            >
                              <X />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Delete leave record for ${l.name}`}
                          onClick={() => {
                            deleteLeave(l.id);
                            toast.success("Record removed");
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
