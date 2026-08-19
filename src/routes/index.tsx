import { createFileRoute } from "@tanstack/react-router";
import { Clock, Coins, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { OccupancyHeatmap } from "@/components/dashboard/heatmap";
import { AttendanceTrendChart, LaborCostChart } from "@/components/dashboard/trend-chart";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { RosterTable } from "@/components/dashboard/roster-table";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { AbsencePanel } from "@/components/dashboard/absence-panel";
import { employees, laborBudget, OVERTIME_THRESHOLD, weeklyTrend } from "@/lib/workforce-data";

const title = "ShiftOps — Manager Dashboard";
const description =
  "Realtime attendance, labor cost analytics, peak-hour heatmaps and overtime alerts for shift-based teams.";

export const Route = createFileRoute("/")({
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
  component: Dashboard,
});

function Dashboard() {
  const onFloor = employees.filter((e) => e.status === "in" || e.status === "break").length;
  const todayCost = employees.reduce((s, e) => s + e.hoursToday * e.hourlyRate, 0);
  const overtimeStaff = employees.filter((e) => e.weekHours > OVERTIME_THRESHOLD);
  const avgHours = weeklyTrend.reduce((s, d) => s + d.hours, 0) / weeklyTrend.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Operations overview</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Today at a glance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Three sites · shift window 06:00 – 23:00 · labor budget R{laborBudget.toLocaleString()}/day
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="On the floor"
          value={`${onFloor}/${employees.length}`}
          delta="+2"
          trend="up"
          icon={Users}
          hint="vs rostered"
        />
        <StatCard
          label="Labor cost today"
          value={`R${Math.round(todayCost).toLocaleString()}`}
          delta={`${Math.round((todayCost / laborBudget) * 100)}% of budget`}
          trend={todayCost > laborBudget ? "down" : "up"}
          icon={Coins}
        />
        <StatCard
          label="Overtime exposure"
          value={`${overtimeStaff.length} staff`}
          delta={`${overtimeStaff.reduce((s, e) => s + e.overtimeHours, 0).toFixed(1)}h`}
          trend="down"
          icon={Clock}
          hint="above 40h"
        />
        <StatCard
          label="Avg daily hours"
          value={`${avgHours.toFixed(0)}h`}
          delta="+4.2%"
          trend="up"
          icon={TrendingUp}
          hint="7-day"
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <LaborCostChart />
        <AttendanceTrendChart />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <OccupancyHeatmap />
        <AlertsPanel />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RosterTable />
        <LiveFeed />
      </section>

      <section className="mt-4">
        <AbsencePanel />
      </section>
    </div>
  );
}
