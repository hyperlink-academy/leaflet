import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDayTick, formatYTick, niceYMax } from "./dates";
import { ChartSkeleton } from "./Skeletons";
import { ChartTooltip } from "./ChartTooltip";

export const SubscribersChart = (props: {
  data: { day: string; total_subscribers: number }[];
  isLoading: boolean;
}) => {
  if (props.isLoading) {
    return <ChartSkeleton />;
  }
  if (props.data.length === 0) {
    return (
      <div className="aspect-[4/3] sm:aspect-[5/2] w-full border border-border grow flex items-center justify-center text-tertiary">
        No subscriber data
      </div>
    );
  }
  return (
    <div className="aspect-[4/3] sm:aspect-[5/2] w-full grow mt-4 mb-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={props.data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-light)"
          />
          <XAxis
            dataKey="day"
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
            content={(p) => <ChartTooltip {...p} unit="subscribers" />}
          />
          <Area
            type="monotone"
            dataKey="total_subscribers"
            name="Subscribers"
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
