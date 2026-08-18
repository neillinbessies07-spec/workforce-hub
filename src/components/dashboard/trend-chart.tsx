import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { weeklyTrend } from "@/lib/workforce-data";
import { useHydrated } from "@/hooks/use-hydrated";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function ChartFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em]">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4 h-56">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.6rem",
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)" },
} as const;

export function LaborCostChart() {
  const hydrated = useHydrated();
  return (
    <ChartFrame title="Labor cost vs hours" subtitle="Rolling 7 days, all sites">
      {hydrated && (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={weeklyTrend} margin={{ left: -18, right: 4, top: 6 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axis} />
            <YAxis tickLine={false} axisLine={false} tick={axis} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="cost" name="Cost (R)" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Line
              type="monotone"
              dataKey="hours"
              name="Hours"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

export function AttendanceTrendChart() {
  const hydrated = useHydrated();
  return (
    <ChartFrame title="Attendance vs schedule" subtitle="Worked hours against rostered hours">
      {hydrated && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyTrend} margin={{ left: -18, right: 4, top: 6 }}>
            <defs>
              <linearGradient id="worked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axis} />
            <YAxis tickLine={false} axisLine={false} tick={axis} />
            <Tooltip {...tooltipStyle} />
            <Area
              type="monotone"
              dataKey="hours"
              name="Worked"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#worked)"
            />
            <Area
              type="monotone"
              dataKey="scheduled"
              name="Scheduled"
              stroke="var(--chart-3)"
              strokeDasharray="4 4"
              strokeWidth={2}
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

export { BarChart };
