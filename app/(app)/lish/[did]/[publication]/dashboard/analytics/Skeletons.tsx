import {
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export const ChartSkeleton = () => (
  <div className="aspect-[4/3] sm:aspect-[5/2] w-full grow animate-pulse">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={[{ day: "", v: 0 }]}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border-light)"
        />
        <XAxis
          dataKey="day"
          tick={false}
          stroke="var(--color-border-light)"
          tickMargin={8}
          height={30}
        />
        <YAxis
          tick={false}
          stroke="var(--color-border-light)"
          tickMargin={4}
          width={32}
          domain={[0, 100]}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="flex flex-col gap-2 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex justify-between items-center">
        <div className="h-[14px] bg-border-light rounded w-2/3" />
        <div className="h-[14px] bg-border-light rounded w-8" />
      </div>
    ))}
  </div>
);
