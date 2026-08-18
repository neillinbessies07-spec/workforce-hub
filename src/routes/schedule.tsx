import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteShift,
  isoDate,
  peopleFrom,
  saveShift,
  useStore,
  type StoreState,
} from "@/lib/shiftops-store";

const title = "ShiftOps — Shift Schedule";
const description =
  "Managers plan and publish shifts per employee: date, start and end times, site and notes, visible to staff on the clock-in kiosk.";

export const Route = createFileRoute("/schedule")({
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
  component: SchedulePage,
});

const selectShifts = (s: StoreState) => s.shifts;
const selectPeople = (s: StoreState) => peopleFrom(s);

function SchedulePage() {
  const shifts = useStore(selectShifts);
  const people = useStore(selectPeople);

  const [personId, setPersonId] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("16:00");
  const [note, setNote] = useState("");

  const byDate = useMemo(() => {
    const map = new Map<string, typeof shifts>();
    [...shifts]
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .forEach((s) => map.set(s.date, [...(map.get(s.date) ?? []), s]));
    return [...map.entries()];
  }, [shifts]);

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;

  function add() {
    const person = people.find((p) => p.id === personId);
    if (!person) {
      toast.error("Pick an employee first");
      return;
    }
    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }
    saveShift({ personId: person.id, date, start, end, site: person.site, note: note.trim() });
    setNote("");
    toast.success(`Shift added for ${person.name}`, { description: `${date} · ${start}–${end}` });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Planning</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Shift schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign shifts per employee. Published shifts appear as “upcoming” on the clock-in kiosk.
        </p>
      </header>

      <div className="panel p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Plus className="size-4 text-primary" /> New shift
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2 text-xs text-muted-foreground">
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
                  {p.isAccount ? " (account)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Date
            <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-xs text-muted-foreground">
            Start
            <Input type="time" className="mt-1" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="text-xs text-muted-foreground">
            End
            <Input type="time" className="mt-1" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="text-xs text-muted-foreground">
            Note
            <Input
              className="mt-1"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <Button className="mt-3" onClick={add}>
          <Plus /> Add shift
        </Button>
      </div>

      <div className="panel mt-4 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="size-4 text-primary" /> Published shifts
        </div>
        {byDate.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No shifts scheduled yet.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {byDate.map(([day, list]) => (
              <div key={day}>
                <p className="tabular text-xs uppercase tracking-widest text-muted-foreground">
                  {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <ul className="mt-2 divide-y divide-border/60 rounded-lg border border-border/60">
                  {list.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <span className="font-medium">{nameOf(s.personId)}</span>
                      <span className="tabular text-muted-foreground">
                        {s.start}–{s.end}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.site}</span>
                      {s.note && <span className="text-xs text-primary">{s.note}</span>}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          deleteShift(s.id);
                          toast.success("Shift removed");
                        }}
                        aria-label={`Delete shift for ${nameOf(s.personId)}`}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
