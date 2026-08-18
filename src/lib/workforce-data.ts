export type ClockStatus = "in" | "out" | "break" | "late" | "absent";

export type Employee = {
  id: string;
  name: string;
  role: string;
  site: string;
  hourlyRate: number;
  badge: string;
  status: ClockStatus;
  clockIn: string | null;
  clockOut: string | null;
  hoursToday: number;
  weekHours: number;
  overtimeHours: number;
  locationVerified: boolean;
  initials: string;
};

export const OVERTIME_THRESHOLD = 40;

export const employees: Employee[] = [
  mk("EMP-1042", "Thandi Mokoena", "Shift Lead", "Sandton Kitchen", 210, "in", "06:58", null, 7.4, 43.5, 3.5, true),
  mk("EMP-1088", "Sipho Dlamini", "Line Cook", "Sandton Kitchen", 145, "in", "07:04", null, 7.2, 38.2, 0, true),
  mk("EMP-1120", "Ayesha Patel", "Barista", "Rosebank Cafe", 138, "break", "08:12", null, 5.9, 41.8, 1.8, true),
  mk("EMP-1155", "Johan van Wyk", "Driver", "Depot North", 165, "in", "05:41", null, 9.1, 47.9, 7.9, false),
  mk("EMP-1190", "Lerato Nkosi", "Cashier", "Rosebank Cafe", 132, "late", "09:37", null, 4.4, 33.1, 0, true),
  mk("EMP-1204", "Daniel Okoro", "Stock Controller", "Depot North", 158, "out", "06:30", "15:02", 8.5, 39.6, 0, true),
  mk("EMP-1233", "Mia Fourie", "Host", "Sandton Kitchen", 128, "absent", null, null, 0, 28.4, 0, true),
  mk("EMP-1261", "Kwame Mensah", "Sous Chef", "Sandton Kitchen", 195, "in", "06:45", null, 7.6, 44.7, 4.7, true),
];

function mk(
  id: string,
  name: string,
  role: string,
  site: string,
  hourlyRate: number,
  status: ClockStatus,
  clockIn: string | null,
  clockOut: string | null,
  hoursToday: number,
  weekHours: number,
  overtimeHours: number,
  locationVerified: boolean,
): Employee {
  return {
    id,
    name,
    role,
    site,
    hourlyRate,
    badge: `SHIFTOPS:${id}`,
    status,
    clockIn,
    clockOut,
    hoursToday,
    weekHours,
    overtimeHours,
    locationVerified,
    initials: name
      .split(" ")
      .map((p) => p[0])
      .join(""),
  };
}

export const statusLabel: Record<ClockStatus, string> = {
  in: "Clocked in",
  out: "Clocked out",
  break: "On break",
  late: "Late",
  absent: "No-show",
};

export type TrendPoint = { day: string; hours: number; cost: number; scheduled: number };

export const weeklyTrend: TrendPoint[] = [
  { day: "Mon", hours: 268, cost: 41300, scheduled: 272 },
  { day: "Tue", hours: 254, cost: 39100, scheduled: 265 },
  { day: "Wed", hours: 289, cost: 45600, scheduled: 270 },
  { day: "Thu", hours: 301, cost: 48250, scheduled: 275 },
  { day: "Fri", hours: 332, cost: 55900, scheduled: 300 },
  { day: "Sat", hours: 358, cost: 62400, scheduled: 310 },
  { day: "Sun", hours: 221, cost: 34800, scheduled: 240 },
];

export const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];

/** Deterministic pseudo-random heatmap of staff on the floor, day x hour. */
export const heatmap: number[][] = days.map((_, d) =>
  hours.map((h) => {
    const lunch = Math.max(0, 10 - Math.abs(h - 13) * 2.2);
    const dinner = Math.max(0, 12 - Math.abs(h - 19) * 2.6);
    const weekend = d >= 4 ? 3 : 0;
    const jitter = ((d * 7 + h * 13) % 5) - 2;
    return Math.max(1, Math.round(4 + lunch + dinner + weekend + jitter));
  }),
);

export type Alert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  time: string;
};

export const alerts: Alert[] = [
  {
    id: "a1",
    severity: "critical",
    title: "Overtime threshold breached",
    detail: "Johan van Wyk is at 47.9h this week (threshold 40h). Projected cost impact R1 304.",
    time: "12 min ago",
  },
  {
    id: "a2",
    severity: "warning",
    title: "Location mismatch on clock-in",
    detail: "Johan van Wyk scanned 1.8 km from Depot North geofence.",
    time: "1 h ago",
  },
  {
    id: "a3",
    severity: "warning",
    title: "Approaching overtime",
    detail: "Kwame Mensah at 44.7h — approve or reschedule Saturday shift.",
    time: "2 h ago",
  },
  {
    id: "a4",
    severity: "info",
    title: "Offline scans synced",
    detail: "3 cached clock events from Depot North synced after connectivity was restored.",
    time: "3 h ago",
  },
];

export const laborBudget = 58000;
