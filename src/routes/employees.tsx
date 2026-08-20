import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Mail, MapPin, Shield, User, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employees as roster } from "@/lib/workforce-data";
import {
  currentAccount,
  leaveKindLabel,
  leaveStatusTone,
  reviewLeave,
  statusTone,
  useStore,
  type StoreState,
} from "@/lib/shiftops-store";

const title = "ShiftOps — Employee Accounts";
const description =
  "Manager view of every employee account: profile details, scheduled shifts, clock-in history and leave requests to approve or reject.";

export const Route = createFileRoute("/employees")({
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
  component: EmployeesPage,
});

const selectAll = (s: StoreState) => s;

type Profile = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  site: string;
  hourlyRate: number;
  isManager: boolean;
  createdAt: string | null;
  badge: string | null;
};

function EmployeesPage() {
  const s = useStore(selectAll);
  const me = currentAccount(s);
  const isManager = Boolean(me?.isManager);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const profiles = useMemo<Profile[]>(() => {
    const accounts: Profile[] = s.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      site: a.site,
      hourlyRate: a.hourlyRate,
      isManager: a.isManager,
      createdAt: a.createdAt,
      badge: null,
    }));
    const demo: Profile[] = roster.map((e) => ({
      id: e.id,
      name: e.name,
      email: null,
      role: e.role,
      site: e.site,
      hourlyRate: e.hourlyRate,
      isManager: false,
      createdAt: null,
      badge: e.badge,
    }));
    return [...accounts, ...demo];
  }, [s.accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.name, p.role, p.site, p.email ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [profiles, query]);

  const selected = profiles.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  const shifts = useMemo(
    () =>
      selected
        ? s.shifts
            .filter((x) => x.personId === selected.id)
            .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
        : [],
    [s.shifts, selected],
  );
  const punches = useMemo(
    () => (selected ? s.punches.filter((p) => p.personId === selected.id).slice(0, 8) : []),
    [s.punches, selected],
  );
  const leave = useMemo(
    () =>
      selected
        ? (s.leave ?? [])
            .filter((l) => l.personId === selected.id)
            .sort((a, b) => b.from.localeCompare(a.from))
        : [],
    [s.leave, selected],
  );

  if (!isManager) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="panel p-6 text-sm text-muted-foreground">
          <Shield className="mb-2 size-5 text-primary" />
          Employee accounts are manager-only. Sign in with a manager account on the{" "}
          <span className="text-foreground">Clock in</span> page.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">People</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Employee accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review profile details, shifts, clock-ins and leave requests for every member of the team.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="panel p-4">
          <Input
            placeholder="Search name, role or site"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                    selected?.id === p.id ? "bg-secondary text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span className="block font-medium text-foreground">{p.name}</span>
                  <span className="block text-xs">
                    {p.role} · {p.site}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">No matches.</li>
            )}
          </ul>
        </div>

        {!selected ? (
          <div className="panel p-6 text-sm text-muted-foreground">Select an employee.</div>
        ) : (
          <div className="space-y-4">
            <div className="panel p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <User className="size-5" />
                </span>
                <div>
                  <div className="text-lg font-semibold">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selected.role} · {selected.site}
                  </div>
                </div>
                {selected.isManager && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                    Manager
                  </span>
                )}
                {!selected.email && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    Demo roster (no account)
                  </span>
                )}
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Employee ID" value={selected.id} />
                <Field
                  label="Email"
                  value={selected.email ?? "—"}
                  icon={<Mail className="size-3.5" />}
                />
                <Field
                  label="Site"
                  value={selected.site}
                  icon={<MapPin className="size-3.5" />}
                />
                <Field label="Hourly rate" value={`R ${selected.hourlyRate.toFixed(2)}`} />
                <Field label="Badge" value={selected.badge ?? "—"} />
                <Field
                  label="Account created"
                  value={selected.createdAt ? selected.createdAt.slice(0, 10) : "—"}
                />
                <Field label="Shifts scheduled" value={String(shifts.length)} />
                <Field label="Leave records" value={String(leave.length)} />
              </dl>
            </div>

            <div className="panel overflow-x-auto p-4">
              <div className="text-sm font-medium">Leave &amp; absence</div>
              {leave.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">No leave logged.</p>
              ) : (
                <table className="mt-3 w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Dates</th>
                      <th className="py-2 pr-3 font-medium">Reason</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 text-right font-medium">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {leave.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 pr-3">{leaveKindLabel[l.kind]}</td>
                        <td className="tabular py-2 pr-3 text-muted-foreground">
                          {l.from === l.to ? l.from : `${l.from} → ${l.to}`}
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {l.reason || "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${leaveStatusTone[l.status]}`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          {l.status === "pending" ? (
                            <div className="flex justify-end gap-1">
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
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {l.reviewedAt ? l.reviewedAt.slice(0, 10) : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="panel p-4">
                <div className="text-sm font-medium">Scheduled shifts</div>
                {shifts.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No shifts assigned.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {shifts.slice(0, 8).map((sh) => (
                      <li key={sh.id} className="flex items-center justify-between gap-3">
                        <span className="tabular text-muted-foreground">{sh.date}</span>
                        <span className="tabular">
                          {sh.start}–{sh.end}
                        </span>
                        <span className="text-xs text-muted-foreground">{sh.site}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="panel p-4">
                <div className="text-sm font-medium">Recent clock events</div>
                {punches.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No punches recorded.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {punches.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3">
                        <span className="capitalize">{p.direction}</span>
                        <span className="tabular text-xs text-muted-foreground">
                          {new Date(p.at).toLocaleString()}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${statusTone[p.status]}`}
                        >
                          {p.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-sm break-all">
        {icon}
        {value}
      </dd>
    </div>
  );
}
