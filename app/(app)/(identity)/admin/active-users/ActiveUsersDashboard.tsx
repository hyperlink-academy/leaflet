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
  formatYTick,
  niceYMax,
} from "app/(app)/(identity)/lish/[did]/[publication]/dashboard/analytics/dates";
import { ChartSkeleton } from "app/(app)/(identity)/lish/[did]/[publication]/dashboard/analytics/Skeletons";

type Granularity = "day" | "week" | "month";
type Stats = Extract<GetActiveUserStatsReturnType, { result: any }>["result"];
type WindowRow = NonNullable<Stats["windows"]["day"]>;

// Series colors are fixed per role (validated for CVD separation on the light
// surface); the legend and tooltip repeat the role in text so color is never
// the only carrier.
const SERIES = [
  { key: "writers_only", label: "Writers only", color: "#2a78d6" },
  { key: "both_roles", label: "Both", color: "#4a3aa7" },
  { key: "readers_only", label: "Readers only", color: "#eb6834" },
] as const;

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
      let res = await callRPC("get_active_user_stats", {
        granularity,
        from,
      });
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
          Signed-in users only. A <strong>writer</strong> edited a document
          (pushed mutations). A <strong>reader</strong> loaded a published page,
          a view-only leaflet, or the reader feed. Days are UTC. Each person
          counts once across devices.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <WindowTile title="Today" row={data?.windows.day} />
        <WindowTile title="Last 7 days" row={data?.windows.week} />
        <WindowTile title="Last 30 days" row={data?.windows.month} />
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
        <Legend />
      </div>

      <RecentActors rows={data?.recent ?? []} isLoading={isLoading && !data} />
    </div>
  );
};

const WindowTile = (props: {
  title: string;
  row: WindowRow | null | undefined;
}) => {
  let r = props.row;
  return (
    <div className="flex flex-col gap-1 border border-border-light rounded-md px-3 py-2">
      <div className="text-sm text-secondary">{props.title}</div>
      <div className="text-2xl font-bold tabular-nums">
        {r ? r.active.toLocaleString() : "–"}
      </div>
      <div className="text-xs text-tertiary flex flex-col tabular-nums">
        <span>writers {r ? r.writers.toLocaleString() : "–"}</span>
        <span>readers {r ? r.readers.toLocaleString() : "–"}</span>
        <span>both {r ? r.both_roles.toLocaleString() : "–"}</span>
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="flex flex-wrap gap-4 text-sm text-secondary">
    {SERIES.map((s) => (
      <span key={s.key} className="flex items-center gap-1">
        <span
          className="inline-block w-3 h-3 rounded-sm"
          style={{ background: s.color }}
        />
        {s.label}
      </span>
    ))}
  </div>
);

// Fills every period between `from` and today so quiet periods render as zero
// instead of being skipped by the line.
function fillPeriods(
  rows: Stats["timeseries"],
  granularity: Granularity,
  from: string,
) {
  let byPeriod = new Map(rows.map((r) => [String(r.period), r]));
  let out: Array<{
    period: string;
    writers_only: number;
    both_roles: number;
    readers_only: number;
    active: number;
  }> = [];
  let cursor = new Date(from + "T00:00:00Z");
  let today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  while (cursor <= today) {
    let key = cursor.toISOString().slice(0, 10);
    let r = byPeriod.get(key);
    out.push({
      period: key,
      writers_only: r?.writers_only ?? 0,
      both_roles: r?.both_roles ?? 0,
      readers_only: r?.readers_only ?? 0,
      active: r?.active ?? 0,
    });
    if (granularity === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (granularity === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

const periodFormatters: Record<Granularity, Intl.DateTimeFormat> = {
  day: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  week: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  month: new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "2-digit",
  }),
};
function formatPeriod(value: string, granularity: Granularity) {
  let d = new Date(value + "T00:00:00");
  if (isNaN(d.getTime())) return value;
  return periodFormatters[granularity].format(d);
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
  let xTicks = useMemo(() => {
    let len = chartData.length;
    if (len === 0) return undefined;
    let step = Math.max(1, Math.ceil((len - 1) / 6));
    let ticks: string[] = [];
    for (let i = 0; i < len; i += step) ticks.push(chartData[i].period);
    let last = chartData[len - 1].period;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [chartData]);

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
            tickFormatter={(v) => formatPeriod(v, props.granularity)}
            ticks={xTicks}
            tickMargin={8}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-secondary)" }}
            stroke="var(--color-border-light)"
            allowDecimals={false}
            tickFormatter={formatYTick}
            tickMargin={4}
            width={32}
            domain={[0, (max: number) => niceYMax(max)]}
          />
          <Tooltip
            isAnimationActive={false}
            content={(p) => (
              <StackTooltip {...p} granularity={props.granularity} />
            )}
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="linear"
              stackId="roles"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={s.color}
              fillOpacity={0.15}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const StackTooltip = (props: {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number | string;
    dataKey?: string | number;
    payload?: { active?: number };
  }>;
  label?: string | number;
  granularity: Granularity;
}) => {
  if (!props.active || !props.payload?.length) return null;
  let total = props.payload[0]?.payload?.active ?? 0;
  return (
    <div className="light-container px-2 py-1 text-sm shadow-sm tabular-nums">
      <div className="text-tertiary text-xs">
        {formatPeriod(String(props.label), props.granularity)}
      </div>
      <div className="font-bold">{Number(total).toLocaleString()} active</div>
      {SERIES.map((s) => {
        let entry = props.payload?.find((p) => p.dataKey === s.key);
        return (
          <div key={s.key} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ background: s.color }}
            />
            {s.label}: {Number(entry?.value ?? 0).toLocaleString()}
          </div>
        );
      })}
    </div>
  );
};

const RecentActors = (props: { rows: Stats["recent"]; isLoading: boolean }) => {
  let format = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [],
  );
  return (
    <div className="flex flex-col gap-3">
      <h3>
        Recently active{" "}
        <span className="font-normal text-tertiary text-sm">
          last 7 days, UTC
        </span>
      </h3>
      {props.isLoading ? (
        <div className="text-tertiary">Loading…</div>
      ) : props.rows.length === 0 ? (
        <div className="text-tertiary">No activity recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-secondary">
              <tr>
                <th className="py-1 pr-3 font-normal">User</th>
                <th className="py-1 pr-3 font-normal">Role</th>
                <th className="py-1 pr-3 font-normal text-right">
                  Writing days
                </th>
                <th className="py-1 pr-3 font-normal text-right">
                  Reading days
                </th>
                <th className="py-1 font-normal">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((r) => (
                <tr
                  key={r.identity_id}
                  className="border-t border-border-light"
                >
                  <td className="py-1 pr-3">
                    {r.handle ? (
                      <a
                        href={`https://bsky.app/profile/${r.handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-contrast hover:underline"
                      >
                        @{r.handle}
                      </a>
                    ) : (
                      <span className="text-tertiary" title={r.identity_id}>
                        {r.did || "email-only account"}
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-3">
                    {r.is_writer && r.is_reader
                      ? "Both"
                      : r.is_writer
                        ? "Writer"
                        : "Reader"}
                  </td>
                  <td className="py-1 pr-3 text-right tabular-nums">
                    {r.writer_days.toLocaleString()}
                  </td>
                  <td className="py-1 pr-3 text-right tabular-nums">
                    {r.reader_days.toLocaleString()}
                  </td>
                  <td className="py-1 whitespace-nowrap text-tertiary">
                    {format.format(new Date(Number(r.last_seen)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
