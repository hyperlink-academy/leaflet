import { Fragment, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Combobox, ComboboxResult } from "components/Combobox";
import { ToggleGroup } from "components/ToggleGroup";
import { usePublicationData } from "../PublicationSWRProvider";
import { formatDayTick, formatYTick, niceYMax } from "./dates";
import { ChartSkeleton, ListSkeleton } from "./Skeletons";
import { ChartTooltip } from "./ChartTooltip";

export type TrafficMetric = "pageviews" | "visitors";
type ReferrerType = { referrer_host: string; pageviews: number };

export const TrafficChart = (props: {
  data: { day: string; pageviews: number; visitors: number }[];
  isLoading: boolean;
  metric: TrafficMetric;
}) => {
  let today = new Date().toISOString().slice(0, 10);
  let metricLabel = props.metric === "pageviews" ? "pageviews" : "visitors";

  let chartData = useMemo(() => {
    if (props.data.length === 0) return [];
    return props.data.map((d, i) => {
      let value = d[props.metric];
      let isToday = d.day === today;
      let isBeforeToday =
        i === props.data.length - 2 &&
        props.data[props.data.length - 1]?.day === today;
      return {
        day: d.day,
        // Solid line: all points except today
        complete: isToday ? undefined : value,
        // Dashed line: bridge from yesterday to today
        partial: isToday || isBeforeToday ? value : undefined,
      };
    });
  }, [props.data, props.metric, today]);

  let xTicks = useMemo(() => {
    if (chartData.length === 0) return undefined;
    let len = chartData.length;
    let target = 6;
    let step = Math.max(1, Math.ceil((len - 1) / target));
    let ticks: string[] = [];
    for (let i = 0; i < len; i += step) ticks.push(chartData[i].day);
    let last = chartData[len - 1].day;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [chartData]);

  if (props.isLoading) {
    return <ChartSkeleton />;
  }
  if (props.data.length === 0) {
    return (
      <div className="aspect-[4/3] sm:aspect-[5/2] w-full border border-border grow flex items-center justify-center text-tertiary">
        No traffic data
      </div>
    );
  }
  return (
    <div className="aspect-[4/3] sm:aspect-[5/2] w-full grow">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-light)"
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "var(--color-secondary)" }}
            stroke="var(--color-border-light)"
            tickFormatter={formatDayTick}
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
            content={(p) => <ChartTooltip {...p} unit={metricLabel} />}
          />
          <Area
            type="linear"
            dataKey="complete"
            name="Pageviews"
            stroke="var(--color-accent-contrast)"
            fill="var(--color-accent-contrast)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
          <Area
            type="linear"
            dataKey="partial"
            name="partial"
            stroke="var(--color-accent-contrast)"
            strokeDasharray="4 4"
            fill="var(--color-accent-contrast)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MetricToggle = (props: {
  metric: TrafficMetric;
  setMetric: (m: TrafficMetric) => void;
}) => {
  return (
    <ToggleGroup<TrafficMetric>
      value={props.metric}
      onChange={props.setMetric}
      className="shrink-0 p-0.5! rounded-[6px]!"
      options={[
        { value: "visitors", label: "Visitors" },
        { value: "pageviews", label: "Page Views" },
      ]}
    />
  );
};

export const PostSelector = (props: {
  selectedPost: { title: string; path: string } | undefined;
  setSelectedPost: (s: { title: string; path: string } | undefined) => void;
}) => {
  let { data } = usePublicationData();
  let { documents } = data || {};

  let posts = useMemo(
    () =>
      documents?.map((doc) => ({
        title: doc.record.title,
        path: doc.record.path || "",
      })),
    [documents],
  );

  let [highlighted, setHighlighted] = useState<string | undefined>(undefined);
  let [searchValue, setSearchValue] = useState<string>("");

  let postTitles = posts?.map((p) => p.title);
  let filteredTitles = useMemo(
    () =>
      postTitles &&
      postTitles.filter((title) =>
        title.toLowerCase().includes(searchValue.toLowerCase()),
      ),
    [searchValue, postTitles],
  );

  let filteredTitlesWithClear = ["All Posts", ...(filteredTitles || [])];

  return (
    <Combobox
      trigger={
        <button className="text-tertiary truncate min-w-0 w-full">
          {props.selectedPost?.title ?? "All Posts"}
        </button>
      }
      results={filteredTitlesWithClear || []}
      highlighted={highlighted}
      setHighlighted={setHighlighted}
      onSelect={() => {
        if (highlighted === "All Posts" || !highlighted) {
          props.setSelectedPost(undefined);
        } else {
          let post = posts?.find((p) => p.title === highlighted);
          props.setSelectedPost(post);
        }
      }}
      sideOffset={2}
      searchValue={searchValue}
      setSearchValue={setSearchValue}
      showSearch
    >
      {filteredTitlesWithClear.map((title) => {
        if (title === "All Posts")
          return (
            <>
              <ComboboxResult
                key="all posts"
                result={title}
                onSelect={() => {
                  props.setSelectedPost(undefined);
                }}
                highlighted={highlighted}
                setHighlighted={setHighlighted}
              >
                All Posts
              </ComboboxResult>
              {filteredTitles && filteredTitles.length !== 0 && (
                <hr className="mx-1 border-border-light" />
              )}
            </>
          );
        return (
          <ComboboxResult
            key={title}
            result={title}
            onSelect={() => {
              let post = posts?.find((p) => p.title === title);
              props.setSelectedPost(post);
            }}
            highlighted={highlighted}
            setHighlighted={setHighlighted}
          >
            {title}
          </ComboboxResult>
        );
      })}
    </Combobox>
  );
};

export const TopPages = (props: {
  pages: { path: string; pageviews: number }[];
  selectedPost: { title: string; path: string } | undefined;
  setSelectedPost: (s: { title: string; path: string } | undefined) => void;
  isLoading: boolean;
}) => {
  let { data } = usePublicationData();
  let docsByPath = useMemo(() => {
    let map = new Map<string, { title: string; path: string }>();
    for (let doc of data?.documents || []) {
      let path = doc.record.path || "";
      let normalized = path.startsWith("/") ? path : `/${path}`;
      map.set(normalized, { title: doc.record.title, path });
    }
    return map;
  }, [data?.documents]);

  return (
    <div className="flex flex-col w-full">
      <h4 className="text-sm font-bold text-secondary pb-1">Top Pages</h4>
      <div className="h-32 overflow-y-auto">
        {props.isLoading && <ListSkeleton />}
        {!props.isLoading && props.pages.length === 0 && (
          <div className="text-tertiary text-sm">No pages yet…</div>
        )}
        {props.pages.map((page) => {
          let doc = docsByPath.get(page.path);
          let isSelected = selectedPostPath(props.selectedPost) === page.path;
          return (
            <Fragment key={page.path}>
              <button
                className={`w-full flex justify-between gap-4 px-1 py-1.5 items-center text-sm rounded-md ${isSelected ? "text-accent-contrast bg-[var(--accent-light)]" : ""}`}
                onClick={() => {
                  if (isSelected) {
                    props.setSelectedPost(undefined);
                  } else {
                    let path = page.path.replace(/^\//, "");
                    props.setSelectedPost({
                      title: doc?.title || page.path,
                      path,
                    });
                  }
                }}
              >
                <div className="truncate text-left">
                  {doc ? (
                    <>
                      <div className="truncate">{doc.title}</div>
                      <div className="truncate text-tertiary text-xs">
                        {page.path}
                      </div>
                    </>
                  ) : (
                    <div className="truncate">{page.path}</div>
                  )}
                </div>
                <div className="shrink-0 tabular-nums">
                  {page.pageviews.toLocaleString()}
                </div>
              </button>
              <hr className="border-border-light last:hidden" />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

function selectedPostPath(
  post: { title: string; path: string } | undefined,
): string | undefined {
  if (!post) return undefined;
  return post.path.startsWith("/") ? post.path : `/${post.path}`;
}

export const TopReferrors = (props: {
  refferors: ReferrerType[];
  setSelectedReferrer: (host: string | undefined) => void;
  selectedReferrer: string | undefined;
  isLoading: boolean;
}) => {
  return (
    <div className="topReferrors flex flex-col w-full">
      <h4 className="text-sm font-bold text-secondary pb-1">Top Referrers</h4>
      <div className="h-32 overflow-y-auto">
        {props.isLoading && <ListSkeleton />}
        {!props.isLoading && props.refferors.length === 0 && (
          <div className="text-tertiary text-sm">No referrers yet…</div>
        )}
        {props.refferors.map((ref) => {
          let selected = props.selectedReferrer === ref.referrer_host;
          return (
            <Fragment key={ref.referrer_host}>
              <button
                className={`w-full flex justify-between gap-4 px-1 py-1.5 items-center text-right text-sm rounded-md ${selected ? "text-accent-contrast bg-[var(--accent-light)]" : ""}`}
                onClick={() => {
                  if (selected) {
                    props.setSelectedReferrer(undefined);
                  } else {
                    props.setSelectedReferrer(ref.referrer_host);
                  }
                }}
              >
                <div className="flex gap-2 items-center grow">
                  {ref.referrer_host}
                </div>
                {ref.pageviews.toLocaleString()}
              </button>
              <hr className="border-border-light last:hidden" />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
