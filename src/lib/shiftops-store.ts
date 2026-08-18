import { useCallback, useSyncExternalStore } from "react";
import { employees } from "@/lib/workforce-data";

/**
 * Front-end demo store. All data lives in this browser's localStorage —
 * there is no backend yet, so accounts and shifts do not travel between devices.
 */

export type Account = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  site: string;
  hourlyRate: number;
  isManager: boolean;
  createdAt: string;
};

export type Shift = {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  site: string;
  note: string;
};

export type PunchStatus = "pending" | "approved" | "rejected";

export type Punch = {
  id: string;
  personId: string;
  name: string;
  badge: string;
  direction: "in" | "out";
  at: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  synced: boolean;
  status: PunchStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type StoreState = {
  accounts: Account[];
  sessionId: string | null;
  shifts: Shift[];
  punches: Punch[];
};

const KEY = "shiftops.state.v2";

const empty: StoreState = { accounts: [], sessionId: null, shifts: [], punches: [] };

let state: StoreState = empty;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): StoreState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...empty, shifts: seedShifts() };
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    return {
      accounts: parsed.accounts ?? [],
      sessionId: parsed.sessionId ?? null,
      shifts: parsed.shifts ?? [],
      punches: parsed.punches ?? [],
    };
  } catch {
    return empty;
  }
}

function commit(next: StoreState) {
  state = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = read();
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = read();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore<T>(selector: (s: StoreState) => T): T {
  const get = useCallback(() => selector(state), [selector]);
  const getServer = useCallback(() => selector(empty), [selector]);
  return useSyncExternalStore(subscribe, get, getServer);
}

/* ---------------- helpers ---------------- */

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function seedShifts(): Shift[] {
  const today = new Date();
  return employees.slice(0, 5).flatMap((e, i) =>
    [0, 1, 2].map((offset) => ({
      id: `seed-${e.id}-${offset}`,
      personId: e.id,
      date: isoDate(addDays(today, offset)),
      start: ["06:00", "08:00", "14:00"][(i + offset) % 3]!,
      end: ["14:00", "16:00", "22:00"][(i + offset) % 3]!,
      site: e.site,
      note: "",
    })),
  );
}

/** Demo-only password digest — not a substitute for server-side auth. */
function digest(pw: string) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return `d${(h >>> 0).toString(36)}`;
}

export type Person = { id: string; name: string; role: string; site: string; isAccount: boolean };

export function peopleFrom(s: StoreState): Person[] {
  const accounts: Person[] = s.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    site: a.site,
    isAccount: true,
  }));
  const roster: Person[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    site: e.site,
    isAccount: false,
  }));
  return [...accounts, ...roster];
}

export function currentAccount(s: StoreState): Account | null {
  return s.accounts.find((a) => a.id === s.sessionId) ?? null;
}

/* ---------------- actions ---------------- */

export function signUp(input: {
  email: string;
  password: string;
  name: string;
  role: string;
  site: string;
  hourlyRate: number;
}): { ok: true; account: Account } | { ok: false; error: string } {
  ensureHydrated();
  const email = input.email.trim().toLowerCase();
  if (state.accounts.some((a) => a.email === email)) {
    return { ok: false, error: "An account with that email already exists." };
  }
  if (input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const account: Account = {
    id: `ACC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    email,
    passwordHash: digest(input.password),
    name: input.name.trim(),
    role: input.role.trim() || "Staff",
    site: input.site.trim() || "Sandton Kitchen",
    hourlyRate: Number.isFinite(input.hourlyRate) ? input.hourlyRate : 0,
    // First account to register runs the floor.
    isManager: state.accounts.length === 0,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, accounts: [...state.accounts, account], sessionId: account.id });
  return { ok: true, account };
}

export function signIn(email: string, password: string): { ok: true } | { ok: false; error: string } {
  ensureHydrated();
  const acc = state.accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!acc || acc.passwordHash !== digest(password)) {
    return { ok: false, error: "Email or password is incorrect." };
  }
  commit({ ...state, sessionId: acc.id });
  return { ok: true };
}

export function signOut() {
  ensureHydrated();
  commit({ ...state, sessionId: null });
}

export function saveShift(shift: Omit<Shift, "id"> & { id?: string }) {
  ensureHydrated();
  if (shift.id) {
    const next = state.shifts.map((s) => (s.id === shift.id ? ({ ...s, ...shift } as Shift) : s));
    commit({ ...state, shifts: next });
    return;
  }
  const created: Shift = { ...shift, id: crypto.randomUUID() };
  commit({ ...state, shifts: [...state.shifts, created] });
}

export function deleteShift(id: string) {
  ensureHydrated();
  commit({ ...state, shifts: state.shifts.filter((s) => s.id !== id) });
}

export function recordPunch(p: Omit<Punch, "status" | "reviewedAt" | "reviewNote">) {
  ensureHydrated();
  const punch: Punch = { ...p, status: "pending", reviewedAt: null, reviewNote: null };
  commit({ ...state, punches: [punch, ...state.punches].slice(0, 100) });
  return punch;
}

export function markSynced(ids?: string[]) {
  ensureHydrated();
  const next = state.punches.map((p) =>
    !ids || ids.includes(p.id) ? { ...p, synced: true } : p,
  );
  commit({ ...state, punches: next });
}

export function reviewPunch(id: string, status: Exclude<PunchStatus, "pending">, note?: string) {
  ensureHydrated();
  const next = state.punches.map((p) =>
    p.id === id
      ? { ...p, status, reviewedAt: new Date().toISOString(), reviewNote: note ?? null }
      : p,
  );
  commit({ ...state, punches: next });
}

export function upcomingShifts(s: StoreState, personId: string, limit = 5): Shift[] {
  const today = isoDate(new Date());
  return s.shifts
    .filter((x) => x.personId === personId && x.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .slice(0, limit);
}

export const statusTone: Record<PunchStatus, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
};
