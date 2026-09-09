"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { callRPC } from "app/api/rpc/client";
import type { GetActiveUserStatsReturnType } from "app/api/rpc/[command]/get_active_user_stats";
import { ToggleGroup } from "components/ToggleGroup";
import {
  formatDayTick,
  formatYTick,
  niceYMax,
} from "app/(app)/(identity)/lish/[did]/[publication]/dashboard/analytics/dates";
import { ChartSkeleton } from "app/(app)/(identity)/lish/[did]/[publication]/dashboard/analytics/Skeletons";
import { ChartTooltip } from "app/(app)/(identity)/lish/[did]/[publication]/dashboard/analytics/ChartTooltip";

type Granularity = "day" | "week" | "month";
type Stats = Extract<GetActiveUserStatsReturnType, { result: any }>["result"];

const RANGE_BY_GRANULARITY: Record<
  Granularity,
  { count: number; label: string }
> = {
  day: { count: 30, label: "Last 30 days" },
  week: { count: 12, label: "Last 12 weeks" },
  month: { count: 12, label: "Last 12 months" },
};

export const ActiveUsersDashboard = () => {
  let [granularity, setGranularity] = useState<Granularity>("day");

  let from = useMemo(() => {
    let d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    let { count } = RANGE_BY_GRANULARITY[granularity];
    if (granularity === "day") d.setUTCDate(d.getUTCDate() - (count - 1));
    else if (granularity === "week") {
      d.setUTCDate(
        d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7 * (count - 1),
      );
    } else {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - (count - 1));
    }
    return d.toISOString().slice(0, 10);
  }, [granularity]);

  let { data, isLoading } = useSWR(
    ["active-user-stats", granularity, from],
    async () => {
      let res = await callRPC("get_active_user_stats", { granularity, from });
      if ("error" in res) throw new Error(res.error);
      return res.result;
    },
    { keepPreviousData: true },
  );

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h2>Active users</h2>
        <div className="text-secondary leading-snug">
          Signed-in users who viewed a page or edited a document. Days are UTC.
          Each person counts once across devices.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <WindowTile title="Today" value={data?.windows.day} />
        <WindowTile title="Last 7 days" value={data?.windows.week} />
        <WindowTile title="Last 30 days" value={data?.windows.month} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3>
            Active per {granularity}{" "}
            <span className="font-normal text-tertiary text-sm">
              {RANGE_BY_GRANULARITY[granularity].label}
            </span>
          </h3>
          <ToggleGroup
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: "day", label: "Daily" },
              { value: "week", label: "Weekly" },
              { value: "month", label: "Monthly" },
            ]}
          />
        </div>
        <ActiveUsersChart
          data={data?.timeseries ?? []}
          granularity={granularity}
          from={from}
          isLoading={isLoading && !data}
        />
      </div>
    </div>
  );
};

const WindowTile = (props: {
  title: string;
  value: number | null | undefined;
}) => (
  <div className="flex flex-col gap-1 border border-border-light rounded-md px-3 py-2">
    <div className="text-sm text-secondary">{props.title}</div>
    <div className="text-2xl font-bold tabular-nums">
      {props.value == null ? "–" : props.value.toLocaleString()}
    </div>
  </div>
);

// Fills every period between `from` and today so quiet periods render as zero
// instead of being skipped by the line.
function fillPeriods(
  rows: Stats["timeseries"],
  granularity: Granularity,
  from: string,
) {
  let byPeriod = new Map(rows.map((r) => [String(r.period), r.active]));
  let out: { period: string; active: number }[] = [];
  let cursor = new Date(from + "T00:00:00Z");
  let today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  while (cursor <= today) {
    let key = cursor.toISOString().slice(0, 10);
    out.push({ period: key, active: byPeriod.get(key) ?? 0 });
    if (granularity === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (granularity === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

const ActiveUsersChart = (props: {
  data: Stats["timeseries"];
  granularity: Granularity;
  from: string;
  isLoading: boolean;
}) => {
  let chartData = useMemo(
    () => fillPeriods(props.data, props.granularity, props.from),
    [props.data, props.granularity, props.from],
  );

  if (props.isLoading) return <ChartSkeleton />;
  return (
    <div className="aspect-[4/3] sm:aspect-[5/2] w-full grow">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-light)"
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12, fill: "var(--color-secondary)" }}
            stroke="var(--color-border-light)"
            tickFormatter={formatDayTick}
            interval="preserveStartEnd"
            minTickGap={32}
            tickMargin={8}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-secondary)" }}
            stroke="var(--color-border-light)"
            allowDecimals={false}
            tickFormatter={formatYTick}
            tickMargin={4}
            width={40}
            domain={[0, (max: number) => niceYMax(max)]}
          />
          <Tooltip
            isAnimationActive={false}
            content={(p) => <ChartTooltip {...p} unit="active users" />}
          />
          <Area
            type="monotone"
            dataKey="active"
            name="Active users"
            stroke="var(--color-accent-contrast)"
            fill="var(--color-accent-contrast)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
