"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
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
type Window = NonNullable<Stats["windows"]["day"]>;
type MetricKey = Exclude<keyof Stats["timeseries"][number], "period">;
type Metric = {
  key: MetricKey;
  title: string;
  unit: string;
  // Periods before an event was tracked are gaps, not zeros.
  trackedSince: string;
  // Used beside a number when this metric rides another chart as a secondary line.
  short?: string;
};

const CORE_METRICS: Metric[] = [
  {
    key: "active",
    title: "Active users",
    unit: "users",
    trackedSince: "2026-09-05",
  },
  {
    key: "pro_active",
    title: "Pro active users",
    unit: "users",
    trackedSince: "2026-09-09",
    short: "pro",
  },
];

const METRIC_GROUPS: { title: string; metrics: Metric[] }[] = [
  {
    title: "Acquisition",
    metrics: [
      {
        key: "signups",
        title: "Signups",
        unit: "signups",
        trackedSince: "2026-09-10",
      },
    ],
  },
  {
    title: "Writing",
    metrics: [
      {
        key: "documents_created",
        title: "Documents created",
        unit: "documents",
        trackedSince: "2026-09-10",
      },
      {
        key: "posts_published",
        title: "Posts published",
        unit: "posts",
        trackedSince: "2026-09-10",
      },
      {
        key: "publications_created",
        title: "Publications created",
        unit: "publications",
        trackedSince: "2026-09-10",
      },
    ],
  },
  {
    title: "Readers",
    metrics: [
      {
        key: "subscribes",
        title: "Subscriptions",
        unit: "subscriptions",
        trackedSince: "2026-09-10",
      },
      {
        key: "unsubscribes",
        title: "Unsubscribes",
        unit: "unsubscribes",
        trackedSince: "2026-09-10",
      },
      {
        key: "memberships_joined",
        title: "Memberships joined",
        unit: "memberships",
        trackedSince: "2026-09-10",
      },
    ],
  },
  {
    title: "Revenue",
    metrics: [
      {
        key: "pro_upgrades",
        title: "Pro upgrades",
        unit: "upgrades",
        trackedSince: "2026-09-10",
      },
      {
        key: "pro_cancels",
        title: "Pro cancellations",
        unit: "cancellations",
        trackedSince: "2026-09-10",
      },
      {
        key: "connect_onboardings_started",
        title: "Payments onboarding started",
        unit: "creators",
        trackedSince: "2026-09-10",
      },
      {
        key: "connect_accounts_enabled",
        title: "Payments enabled",
        unit: "creators",
        trackedSince: "2026-09-10",
      },
    ],
  },
];

const RANGE_BY_GRANULARITY: Record<Granularity, number> = {
  day: 30,
  week: 12,
  month: 12,
};

const LAST_COMPLETE_LABEL: Record<Granularity, string> = {
  day: "yesterday",
  week: "last week",
  month: "last month",
};

// Every chart shares these so their plot areas align vertically.
const Y_AXIS_WIDTH = 40;
const CHART_MARGIN = { top: 8, right: 56, bottom: 0, left: 0 };

export const ActiveUsersDashboard = () => {
  let [granularity, setGranularity] = useState<Granularity>("day");

  let from = useMemo(() => {
    let d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    let count = RANGE_BY_GRANULARITY[granularity];
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

  let { data, isLoading, isValidating } = useSWR(
    ["active-user-stats", granularity, from],
    async () => {
      let res = await callRPC("get_active_user_stats", { granularity, from });
      if ("error" in res) throw new Error(res.error);
      return res.result;
    },
    { keepPreviousData: true },
  );

  let periods = useMemo(
    () => fillPeriods(data?.timeseries ?? [], granularity, from),
    [data?.timeseries, granularity, from],
  );
  let initialLoad = isLoading && !data;
  let [main, pro] = CORE_METRICS;

  return (
    <div
      className={`w-full max-w-3xl mx-auto flex flex-col gap-8 px-4 py-8 transition-opacity ${
        isValidating && data ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2>Active users</h2>
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
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-secondary">
          <WindowFigure label="so far today" value={data?.windows.day} />
          <WindowFigure label="past 7 days" value={data?.windows.week} />
          <WindowFigure label="past 30 days" value={data?.windows.month} />
        </div>
      </div>

      <BehaviorChart
        metric={main}
        secondary={pro}
        periods={periods}
        granularity={granularity}
        isLoading={initialLoad}
        size="large"
        showXAxis
      />

      <MetricIndex
        periods={periods}
        granularity={granularity}
        isLoading={initialLoad}
      />
    </div>
  );
};

// Every activity metric as a sparkline row; a row expands to its full chart in
// place so the index doubles as the way to jump to one.
const MetricIndex = (props: {
  periods: Period[];
  granularity: Granularity;
  isLoading: boolean;
}) => {
  let [expanded, setExpanded] = useState<Set<MetricKey>>(() => new Set());
  let all = METRIC_GROUPS.flatMap((g) => g.metrics.map((m) => m.key));
  let allExpanded = expanded.size === all.length;
  let toggle = (key: MetricKey) =>
    setExpanded((prev) => {
      let next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-baseline gap-2">
        <h2>Activity</h2>
        <button
          type="button"
          className="text-sm text-accent-contrast hover:underline"
          onClick={() => setExpanded(allExpanded ? new Set() : new Set(all))}
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>
      {METRIC_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <div className="text-sm text-tertiary">{group.title}</div>
          {group.metrics.map((metric) => (
            <MetricRow
              key={metric.key}
              metric={metric}
              periods={props.periods}
              granularity={props.granularity}
              isLoading={props.isLoading}
              expanded={expanded.has(metric.key)}
              onToggle={() => toggle(metric.key)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const MetricRow = (props: {
  metric: Metric;
  periods: Period[];
  granularity: Granularity;
  isLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
}) => {
  let series = useMemo(
    () => buildPoints(props.periods, props.metric, props.granularity),
    [props.periods, props.metric, props.granularity],
  );
  return (
    <div className="flex flex-col border-t border-border-light">
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={props.expanded}
        className="flex items-center gap-3 py-2 text-left hover:bg-border-light/40 -mx-2 px-2 rounded-md"
      >
        <span className="grow font-bold">{props.metric.title}</span>
        {!props.isLoading && (
          <span className={props.expanded ? "invisible" : ""}>
            <Sparkline {...series} />
          </span>
        )}
        <span className="w-28 shrink-0 text-right text-sm text-secondary">
          {series.lastComplete?.complete == null ? (
            "–"
          ) : (
            <>
              <span className="text-primary font-bold">
                {series.lastComplete.complete.toLocaleString()}
              </span>{" "}
              {LAST_COMPLETE_LABEL[props.granularity]}
            </>
          )}
        </span>
      </button>
      {props.expanded && (
        <div className="pb-4">
          <BehaviorChart
            metric={props.metric}
            periods={props.periods}
            granularity={props.granularity}
            isLoading={props.isLoading}
            size="small"
            showXAxis
            hideHeader
          />
        </div>
      )}
    </div>
  );
};

const SPARK_W = 96;
const SPARK_H = 24;

// Word-sized: the limits band, the line broken at gaps, signals as neutral
// dots, and the partial period hollow.
const Sparkline = (props: ReturnType<typeof buildPoints>) => {
  let { points, limits, yMax } = props;
  let n = points.length;
  let x = (i: number) => (n > 1 ? (i / (n - 1)) * SPARK_W : SPARK_W / 2);
  let y = (v: number) => SPARK_H - (v / yMax) * (SPARK_H - 4) - 2;

  let runs: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.complete == null) {
      if (current.length) runs.push(current.join(" "));
      current = [];
    } else current.push(`${x(i)},${y(p.complete)}`);
  });
  if (current.length) runs.push(current.join(" "));

  let partialIndex = points.findIndex((p) => p.isPartial && p.value != null);
  let bridgeFrom = partialIndex - 1;

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      {limits && (
        <rect
          x={0}
          y={y(limits.upper)}
          width={SPARK_W}
          height={Math.max(0, y(limits.lower) - y(limits.upper))}
          fill="var(--color-accent-contrast)"
          fillOpacity={0.08}
        />
      )}
      {runs.map((r, i) => (
        <polyline
          key={i}
          points={r}
          fill="none"
          stroke="var(--color-accent-contrast)"
          strokeWidth={1.25}
          strokeLinejoin="round"
        />
      ))}
      {partialIndex >= 0 &&
        bridgeFrom >= 0 &&
        points[bridgeFrom].complete != null && (
          <line
            x1={x(bridgeFrom)}
            y1={y(points[bridgeFrom].complete!)}
            x2={x(partialIndex)}
            y2={y(points[partialIndex].value!)}
            stroke="var(--color-accent-contrast)"
            strokeWidth={1.25}
            strokeDasharray="2 2"
          />
        )}
      {points.map((p, i) =>
        p.signal && p.complete != null ? (
          <circle
            key={p.period}
            cx={x(i)}
            cy={y(p.complete)}
            r={2.5}
            fill="var(--color-primary)"
          />
        ) : null,
      )}
      {partialIndex >= 0 && (
        <circle
          cx={x(partialIndex)}
          cy={y(points[partialIndex].value!)}
          r={2}
          fill="var(--color-bg-page)"
          stroke="var(--color-accent-contrast)"
          strokeWidth={1}
        />
      )}
    </svg>
  );
};

const WindowFigure = (props: {
  label: string;
  value: Window | null | undefined;
}) => (
  <span>
    <span className="text-primary font-bold">
      {props.value == null ? "–" : props.value.active.toLocaleString()}
    </span>{" "}
    {props.label}
    {props.value != null && (
      <span className="text-tertiary">
        {" "}
        · {props.value.pro_active.toLocaleString()} pro
      </span>
    )}
  </span>
);

type Period = {
  period: string;
  // The period start in ms so tracking-start and current-period checks don't
  // re-parse the key.
  start: number;
  next: number;
  row: Stats["timeseries"][number] | undefined;
};

// Fills every period between `from` and today so quiet periods render as zero
// instead of being skipped by the line.
function fillPeriods(
  rows: Stats["timeseries"],
  granularity: Granularity,
  from: string,
): Period[] {
  let byPeriod = new Map(rows.map((r) => [String(r.period), r]));
  let out: Period[] = [];
  let cursor = new Date(from + "T00:00:00Z");
  let today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  while (cursor <= today) {
    let key = cursor.toISOString().slice(0, 10);
    let start = cursor.getTime();
    if (granularity === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (granularity === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    out.push({
      period: key,
      start,
      next: cursor.getTime(),
      row: byPeriod.get(key),
    });
  }
  return out;
}

type Point = {
  period: string;
  value: number | null;
  // Complete points draw the solid line; the partial current period hangs off
  // the last complete point on a dashed bridge.
  complete: number | null;
  partial: number | null;
  isPartial: boolean;
  signal: Signal | null;
};
type Signal = "above" | "below" | "run";

// Wheeler's XmR chart: natural process limits at the average ± 2.66 × the mean
// moving range. Only complete periods feed the limits.
const XMR_FACTOR = 2.66;
const MIN_POINTS_FOR_LIMITS = 6;
const TENTATIVE_BELOW = 20;
const RUN_LENGTH = 8;

function processLimits(values: number[]) {
  if (values.length < MIN_POINTS_FOR_LIMITS) return null;
  let mean = values.reduce((a, b) => a + b, 0) / values.length;
  let ranges = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  let meanRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  return {
    mean,
    upper: mean + XMR_FACTOR * meanRange,
    lower: Math.max(0, mean - XMR_FACTOR * meanRange),
    tentative: values.length < TENTATIVE_BELOW,
  };
}

function buildPoints(
  periods: Period[],
  metric: Metric,
  granularity: Granularity,
) {
  let trackedSince = new Date(metric.trackedSince + "T00:00:00Z").getTime();
  let now = Date.now();
  let raw = periods.map((p) => {
    let tracked = p.next > trackedSince;
    // A period is partial when tracking started inside it or it hasn't ended.
    let isPartial = tracked && (p.start < trackedSince || p.next > now);
    let value = tracked ? p.row?.[metric.key] ?? 0 : null;
    return { period: p.period, value, isPartial };
  });

  let completeValues = raw
    .filter((p) => !p.isPartial && p.value != null)
    .map((p) => p.value as number);
  let limits = processLimits(completeValues);

  let runSide: 1 | -1 | 0 = 0;
  let runLength = 0;
  let points: Point[] = raw.map((p, i) => {
    let signal: Signal | null = null;
    if (limits && !p.isPartial && p.value != null) {
      let side: 1 | -1 | 0 =
        p.value > limits.mean ? 1 : p.value < limits.mean ? -1 : 0;
      runLength = side !== 0 && side === runSide ? runLength + 1 : 1;
      runSide = side;
      if (p.value > limits.upper) signal = "above";
      else if (p.value < limits.lower) signal = "below";
      else if (side !== 0 && runLength >= RUN_LENGTH) signal = "run";
    }
    let nextIsPartial = raw[i + 1]?.isPartial && raw[i + 1].value != null;
    return {
      period: p.period,
      value: p.value,
      complete: p.isPartial ? null : p.value,
      partial: p.isPartial || nextIsPartial ? p.value : null,
      isPartial: p.isPartial,
      signal,
    };
  });

  let lastComplete = [...points].reverse().find((p) => p.complete != null);
  let dataMax = Math.max(0, ...points.map((p) => p.value ?? 0));
  let yMax = Math.ceil(niceYMax(Math.max(dataMax, limits?.upper ?? 0)));
  return { points, limits, lastComplete, yMax };
}

// `secondary` rides the same axes as a lighter line with no limits of its own;
// it must never exceed the primary (Pro active users ⊂ active users).
const BehaviorChart = (props: {
  metric: Metric;
  secondary?: Metric;
  periods: Period[];
  granularity: Granularity;
  isLoading: boolean;
  size: "large" | "small";
  showXAxis: boolean;
  hideHeader?: boolean;
}) => {
  let { points, limits, lastComplete, yMax } = useMemo(
    () => buildPoints(props.periods, props.metric, props.granularity),
    [props.periods, props.metric, props.granularity],
  );
  let secondary = useMemo(
    () =>
      props.secondary
        ? buildPoints(props.periods, props.secondary, props.granularity)
        : null,
    [props.periods, props.secondary, props.granularity],
  );
  let chartData = useMemo(
    () =>
      points.map((p, i) => ({
        ...p,
        secondary: secondary?.points[i]?.complete ?? null,
        secondaryPartial: secondary?.points[i]?.partial ?? null,
        secondaryValue: secondary?.points[i]?.value ?? null,
      })),
    [points, secondary],
  );
  let xTicks = useMemo(() => pickTicks(points.map((p) => p.period)), [points]);

  let heightClass =
    props.size === "large" ? "aspect-[4/3] sm:aspect-[5/2]" : "h-[112px]";

  return (
    <div className="flex flex-col gap-1">
      {!props.hideHeader && (
        <div className="flex justify-between items-baseline gap-2">
          <h3 className={props.size === "small" ? "text-base font-bold" : ""}>
            {props.metric.title}
            {props.secondary && (
              <span className="font-normal text-sm text-secondary ml-3">
                <LineKey opacity={1} width={2} /> {props.metric.title}
                <span className="ml-2">
                  <LineKey opacity={SECONDARY_OPACITY} width={1.25} />{" "}
                  {props.secondary.title}
                </span>
              </span>
            )}
          </h3>
          <div className="text-sm text-secondary">
            {lastComplete?.complete == null ? (
              "–"
            ) : (
              <>
                <span className="text-primary font-bold">
                  {lastComplete.complete.toLocaleString()}
                </span>{" "}
                {LAST_COMPLETE_LABEL[props.granularity]}
                {secondary?.lastComplete?.complete != null && (
                  <span className="text-tertiary">
                    {" "}
                    · {secondary.lastComplete.complete.toLocaleString()}{" "}
                    {props.secondary!.short ?? props.secondary!.title}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {props.isLoading ? (
        <ChartSkeleton />
      ) : (
        <div className={`${heightClass} w-full`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={CHART_MARGIN}>
              <XAxis
                dataKey="period"
                ticks={xTicks}
                tick={
                  props.showXAxis
                    ? { fontSize: 12, fill: "var(--color-secondary)" }
                    : false
                }
                height={props.showXAxis ? 24 : 8}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border-light)" }}
                tickFormatter={(v) => formatPeriod(v, props.granularity)}
                tickMargin={6}
              />
              <YAxis
                ticks={[0, yMax]}
                domain={[0, yMax]}
                tick={{ fontSize: 12, fill: "var(--color-secondary)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={formatYTick}
                tickMargin={4}
                width={Y_AXIS_WIDTH}
              />
              {limits && (
                <>
                  <ReferenceArea
                    y1={limits.lower}
                    y2={limits.upper}
                    fill="var(--color-accent-contrast)"
                    fillOpacity={0.06}
                    stroke="none"
                  />
                  <ReferenceLine
                    y={limits.upper}
                    stroke="var(--color-tertiary)"
                    strokeWidth={1}
                    strokeDasharray={limits.tentative ? "2 3" : undefined}
                    label={limitLabel(limits.upper)}
                  />
                  <ReferenceLine
                    y={limits.mean}
                    stroke="var(--color-secondary)"
                    strokeWidth={1}
                    strokeDasharray={limits.tentative ? "2 3" : undefined}
                    label={limitLabel(limits.mean)}
                  />
                  {limits.lower > 0 && (
                    <ReferenceLine
                      y={limits.lower}
                      stroke="var(--color-tertiary)"
                      strokeWidth={1}
                      strokeDasharray={limits.tentative ? "2 3" : undefined}
                      label={limitLabel(limits.lower)}
                    />
                  )}
                </>
              )}
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: "var(--color-border-light)", strokeWidth: 1 }}
                content={(p) => (
                  <BehaviorTooltip
                    {...p}
                    unit={props.metric.unit}
                    secondaryLabel={
                      props.secondary?.short ?? props.secondary?.title
                    }
                    granularity={props.granularity}
                    limits={limits}
                  />
                )}
              />
              {secondary && (
                <>
                  <Line
                    type="linear"
                    dataKey="secondaryPartial"
                    stroke="var(--color-accent-contrast)"
                    strokeOpacity={SECONDARY_OPACITY}
                    strokeWidth={1.25}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="secondary"
                    stroke="var(--color-accent-contrast)"
                    strokeOpacity={SECONDARY_OPACITY}
                    strokeWidth={1.25}
                    dot={{
                      r: 1.5,
                      strokeWidth: 0,
                      fillOpacity: SECONDARY_OPACITY,
                    }}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </>
              )}
              <Line
                type="linear"
                dataKey="partial"
                stroke="var(--color-accent-contrast)"
                strokeWidth={props.size === "large" ? 2 : 1.5}
                strokeDasharray="3 3"
                dot={renderPartialDot}
                activeDot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="linear"
                dataKey="complete"
                stroke="var(--color-accent-contrast)"
                strokeWidth={props.size === "large" ? 2 : 1.5}
                dot={renderDot}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const SECONDARY_OPACITY = 0.45;

const LineKey = (props: { opacity: number; width: number }) => (
  <svg width={14} height={6} className="inline-block align-middle">
    <line
      x1={0}
      y1={3}
      x2={14}
      y2={3}
      stroke="var(--color-accent-contrast)"
      strokeOpacity={props.opacity}
      strokeWidth={props.width}
    />
  </svg>
);

const limitLabel = (value: number) => ({
  value: Math.round(value).toLocaleString(),
  position: "right" as const,
  offset: 10,
  fontSize: 11,
  fill: "var(--color-tertiary)",
});

// One dot per complete period; signals get a larger neutral marker with a
// surface ring so they stay legible on top of the line.
function renderDot(dotProps: any) {
  let { key, cx, cy, payload } = dotProps as {
    key: string;
    cx: number;
    cy: number;
    payload: Point;
  };
  if (payload.complete == null || cx == null || cy == null)
    return <g key={key} />;
  if (payload.signal) {
    return (
      <circle
        key={key}
        cx={cx}
        cy={cy}
        r={4.5}
        fill="var(--color-primary)"
        stroke="var(--color-bg-page)"
        strokeWidth={2}
      />
    );
  }
  return (
    <circle
      key={key}
      cx={cx}
      cy={cy}
      r={2}
      fill="var(--color-accent-contrast)"
    />
  );
}

function renderPartialDot(dotProps: any) {
  let { key, cx, cy, payload } = dotProps as {
    key: string;
    cx: number;
    cy: number;
    payload: Point;
  };
  if (!payload.isPartial || payload.value == null || cx == null || cy == null)
    return <g key={key} />;
  return (
    <circle
      key={key}
      cx={cx}
      cy={cy}
      r={3}
      fill="var(--color-bg-page)"
      stroke="var(--color-accent-contrast)"
      strokeWidth={1.5}
    />
  );
}

function pickTicks(periods: string[]) {
  if (periods.length === 0) return undefined;
  let step = Math.max(1, Math.ceil((periods.length - 1) / 6));
  let ticks: string[] = [];
  for (let i = 0; i < periods.length; i += step) ticks.push(periods[i]);
  let last = periods[periods.length - 1];
  if (ticks[ticks.length - 1] !== last) ticks.push(last);
  return ticks;
}

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "2-digit",
});

function formatPeriod(period: string, granularity: Granularity) {
  let d = new Date(period + "T00:00:00");
  if (isNaN(d.getTime())) return period;
  return granularity === "month"
    ? monthFormatter.format(d)
    : dayFormatter.format(d);
}

const BehaviorTooltip = (props: {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: Point & { secondaryValue?: number | null };
  }>;
  label?: string | number;
  unit: string;
  secondaryLabel?: string;
  granularity: Granularity;
  limits: ReturnType<typeof processLimits>;
}) => {
  let point = props.payload?.find((p) => p.payload)?.payload;
  if (!props.active || !point || point.value == null) return null;
  let note = point.isPartial
    ? "partial period"
    : point.signal === "above"
      ? `above the upper limit (${Math.round(props.limits!.upper).toLocaleString()})`
      : point.signal === "below"
        ? `below the lower limit (${Math.round(props.limits!.lower).toLocaleString()})`
        : point.signal === "run"
          ? `${RUN_LENGTH}+ periods on one side of the average`
          : null;
  return (
    <div className="light-container px-2 py-1 text-sm shadow-sm">
      <div className="text-tertiary text-xs">
        {props.granularity === "week" ? "Week of " : ""}
        {formatPeriod(String(props.label), props.granularity)}
      </div>
      <div>
        {point.value.toLocaleString()} {props.unit}
        {props.secondaryLabel && point.secondaryValue != null && (
          <span className="text-secondary">
            {" "}
            · {point.secondaryValue.toLocaleString()} {props.secondaryLabel}
          </span>
        )}
      </div>
      {note && <div className="text-secondary text-xs">{note}</div>}
    </div>
  );
};
