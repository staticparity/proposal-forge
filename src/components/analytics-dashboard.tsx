"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AnalyticsData {
  total: number;
  counts: Record<string, number>;
  monthly: { month: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#71717a",
  interview: "#f59e0b",
  won: "#10b981",
  rejected: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  interview: "Interview",
  won: "Won",
  rejected: "Rejected",
};

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const [mounted, setMounted] = useState(false);

  // Hydration guard — recharts is not SSR-safe
  useEffect(() => setMounted(true), []);

  const interviewRate =
    data.total > 0
      ? (((data.counts.interview ?? 0) + (data.counts.won ?? 0)) / data.total) * 100
      : 0;

  const winRate =
    data.total > 0 ? ((data.counts.won ?? 0) / data.total) * 100 : 0;

  const statusChartData = Object.entries(data.counts).map(
    ([status, count]) => ({
      status: STATUS_LABELS[status] ?? status,
      count,
      fill: STATUS_COLORS[status] ?? "#71717a",
    })
  );

  const monthlyChartData = data.monthly.map((m) => ({
    month: formatMonth(m.month),
    proposals: m.count,
  }));

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Proposals"
          value={data.total.toString()}
          description="All-time proposals sent"
          accent="text-foreground"
        />
        <StatCard
          title="Interview Rate"
          value={`${interviewRate.toFixed(1)}%`}
          description="Progressed to interview or won"
          accent="text-amber-400"
        />
        <StatCard
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          description="Proposals that won the job"
          accent="text-emerald-400"
        />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────── */}
      {mounted && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Distribution of proposal outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.total === 0 ? (
                <EmptyChart message="No proposals yet" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={statusChartData} barSize={40}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Trend</CardTitle>
              <CardDescription className="text-xs">
                Proposals generated over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyChartData.length === 0 ? (
                <EmptyChart message="No data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyChartData}>
                    <defs>
                      <linearGradient
                        id="proposalGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="proposals"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#proposalGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{title}</CardDescription>
        <CardTitle className={`text-3xl font-bold tabular-nums ${accent}`}>
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function formatMonth(yyyymm: string) {
  const [year, month] = yyyymm.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
