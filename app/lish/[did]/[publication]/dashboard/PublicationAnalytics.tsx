import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { UpgradeContent } from "../UpgradeModal";
import { Popover } from "components/Popover";
import { DatePicker } from "components/DatePicker";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import type { DateRange } from "react-day-picker";
import { useQueryState } from "src/hooks/useQueryState";
import { usePublicationData } from "./PublicationSWRProvider";
import { Combobox, ComboboxResult } from "components/Combobox";
import { useIsPro, useCanSeePro } from "src/hooks/useEntitlement";
import { callRPC } from "app/api/rpc/client";
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

type ReferrerType = { referrer_host: string; pageviews: number };
type TrafficMetric = "pageviews" | "visitors";
type DatePreset = "Last Week" | "Last Month" | "All Time";
type DateSelection = { range: DateRange; preset: DatePreset | null };

const dayTickFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function formatDayTick(value: string) {
  let d = new Date(value + "T00:00:00");
  if (isNaN(d.getTime())) return value;
  return dayTickFormatter.format(d);
}

function formatYTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function niceYMax(dataMax: number): number {
  if (dataMax <= 0) return 10;
  let rough = dataMax / 4;
  let mag = Math.pow(10, Math.floor(Math.log10(rough)));
  let norm = rough / mag;
  let step =
    norm <= 1.5 ? mag : norm <= 3 ? 2 * mag : norm <= 7 ? 5 * mag : 10 * mag;
  return Math.ceil(dataMax / step) * step + step;
}

function endOfDay(date: Date): Date {
  let d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function fillDailyGaps<T extends { day: string }>(
  data: T[],
  fill: (day: string) => T,
  from?: Date,
  to?: Date,
): T[] {
  let start = from || (data.length > 0 ? new Date(data[0].day) : null);
  let end =
    to || (data.length > 0 ? new Date(data[data.length - 1].day) : null);
  if (!start || !end) return data;

  let lookup = new Map(data.map((d) => [d.day, d]));
  let result: T[] = [];
  let cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  let endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    let key = cursor.toISOString().slice(0, 10);
    result.push(lookup.get(key) ?? fill(key));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export const PublicationAnalytics = (props: {
  showPageBackground: boolean;
}) => {
  let isPro = useIsPro();
  let canSeePro = useCanSeePro();

  let { data: publication } = usePublicationData();

  // URL params:
  //   ?date=all        → All Time (no from/to bounds)
  //   ?date=month      → Last Month preset
  //   ?from=YYYY-MM-DD&to=YYYY-MM-DD → custom range
  //   (none)           → default: Last Week
  let [dateState, setDateState] = useQueryState<DateSelection>({
    fromParams: (get) => {
      let preset = get("date");
      if (preset === "all")
        return {
          range: { from: undefined, to: undefined },
          preset: "All Time",
        };
      if (preset === "month") {
        let from = new Date();
        from.setMonth(from.getMonth() - 1);
        return { range: { from, to: new Date() }, preset: "Last Month" };
      }
      let fromParam = get("from");
      let toParam = get("to");
      if (fromParam || toParam) {
        return {
          range: {
            from: fromParam ? new Date(fromParam) : undefined,
            to: toParam ? new Date(toParam) : new Date(),
          },
          preset: null,
        };
      }
      let from = new Date();
      from.setDate(from.getDate() - 7);
      return { range: { from, to: new Date() }, preset: "Last Week" };
    },
    toParams: ({ preset, range }) => {
      if (preset === "All Time")
        return { date: "all", from: null, to: null };
      if (preset === "Last Month")
        return { date: "month", from: null, to: null };
      if (preset === "Last Week") return { date: null, from: null, to: null };
      return {
        date: null,
        from: range.from?.toISOString().slice(0, 10) ?? null,
        to: range.to?.toISOString().slice(0, 10) ?? null,
      };
    },
  });
  let { range: dateRange, preset: datePreset } = dateState;

  // ?post=<path> — filter traffic to a single published post (path is the stable ID)
  let [selectedPostPath, setSelectedPostPath] = useQueryState<
    string | undefined
  >({
    fromParams: (get) => get("post") ?? undefined,
    toParams: (v) => ({ post: v ?? null }),
  });
  let documents = publication?.documents;
  let selectedPost = useMemo(() => {
    if (!selectedPostPath) return undefined;
    let doc = documents?.find(
      (d) => (d.record.path || "") === selectedPostPath,
    );
    return {
      title: doc?.record.title || selectedPostPath,
      path: selectedPostPath,
    };
  }, [selectedPostPath, documents]);
  let setSelectedPost = useCallback(
    (post: { title: string; path: string } | undefined) => {
      setSelectedPostPath(post?.path);
    },
    [setSelectedPostPath],
  );

  // ?referrer=<host> — filter traffic to a single referring domain
  let [selectedReferrer, setSelectedReferrer] = useQueryState<
    string | undefined
  >({
    fromParams: (get) => get("referrer") ?? undefined,
    toParams: (v) => ({ referrer: v ?? null }),
  });

  // ?metric=pageviews — toggle between "visitors" (default) and "pageviews"
  let [trafficMetric, setTrafficMetric] = useQueryState<TrafficMetric>({
    fromParams: (get) =>
      get("metric") === "pageviews" ? "pageviews" : "visitors",
    toParams: (v) => ({ metric: v === "visitors" ? null : v }),
  });

  let publicationUri = publication?.publication?.uri;

  let { data: analyticsData, isLoading: analyticsLoading } = useSWR(
    publicationUri
      ? [
          "publication-analytics",
          publicationUri,
          dateRange.from?.toISOString(),
          dateRange.to?.toISOString(),
          selectedPost?.path,
          selectedReferrer,
        ]
      : null,
    async () => {
      let res = await callRPC("get_publication_analytics", {
        publication_uri: publicationUri!,
        ...(dateRange.from ? { from: dateRange.from.toISOString() } : {}),
        ...(dateRange.to ? { to: endOfDay(dateRange.to).toISOString() } : {}),
        ...(selectedPost ? { path: `/${selectedPost.path}` } : {}),
        ...(selectedReferrer ? { referrer_host: selectedReferrer } : {}),
      });
      return res?.result;
    },
  );

  let { data: subscribersData, isLoading: subscribersLoading } = useSWR(
    publicationUri
      ? [
          "publication-subscribers-timeseries",
          publicationUri,
          dateRange.from?.toISOString(),
          dateRange.to?.toISOString(),
        ]
      : null,
    async () => {
      let res = await callRPC("get_publication_subscribers_timeseries", {
        publication_uri: publicationUri!,
        ...(dateRange.from ? { from: dateRange.from.toISOString() } : {}),
        ...(dateRange.to ? { to: endOfDay(dateRange.to).toISOString() } : {}),
      });
      return res?.result;
    },
  );

  let filledTraffic = useMemo(
    () =>
      fillDailyGaps(
        analyticsData?.traffic || [],
        (day) => ({ day, pageviews: 0, visitors: 0 }),
        dateRange.from,
        dateRange.to ?? new Date(),
      ),
    [analyticsData?.traffic, dateRange.from, dateRange.to],
  );

  if (!canSeePro) return null;

  if (!isPro)
    return (
      <div
        className={`sm:mx-auto pt-4 s rounded-lg border ${
          props.showPageBackground
            ? "border-border-light p-2"
            : "border-transparent"
        }`}
        style={{
          backgroundColor: props.showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : "transparent",
        }}
      >
        <UpgradeContent />
      </div>
    );

  return (
    <div className="analytics flex flex-col gap-6">
      <div className="flex justify-end gap-2">
        <DateRangeSelector
          dateState={dateState}
          setDateState={setDateState}
          pubStartDate={publication?.publication?.indexed_at}
          showBackground={props.showPageBackground}
        />
      </div>
      <div
        className={`analyticsViewCount rounded-lg border ${
          props.showPageBackground
            ? "border-border-light p-2"
            : "border-transparent"
        }`}
        style={{
          backgroundColor: props.showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : "transparent",
        }}
      >
        <div className="flex items-center gap-2 pb-2 w-full">
          <h3>Traffic</h3>
          <MetricToggle metric={trafficMetric} setMetric={setTrafficMetric} />
          <ArrowRightTiny className="text-border" />
          <PostSelector
            selectedPost={selectedPost}
            setSelectedPost={setSelectedPost}
          />
          {selectedReferrer && (
            <>
              <ArrowRightTiny className="text-border" />
              <div className="text-tertiary">
                {" "}
                {selectedReferrer}
              </div>
            </>
          )}
        </div>
        <TrafficChart data={filledTraffic} isLoading={analyticsLoading} metric={trafficMetric} />
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <TopPages
            pages={analyticsData?.topPages || []}
            selectedPost={selectedPost}
            setSelectedPost={setSelectedPost}
            isLoading={analyticsLoading}
          />
          <TopReferrors
            refferors={analyticsData?.topReferrers || []}
            setSelectedReferrer={setSelectedReferrer}
            selectedReferrer={selectedReferrer}
            isLoading={analyticsLoading}
          />
        </div>
      </div>
      <div
        className={`analyticsSubCount rounded-lg border ${
          props.showPageBackground
            ? "border-border-light p-2"
            : "border-transparent"
        }`}
        style={{
          backgroundColor: props.showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : "transparent",
        }}
      >
        <h3>Subscribers</h3>
        <SubscribersChart
          data={subscribersData?.timeseries || []}
          isLoading={subscribersLoading}
        />
      </div>
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="aspect-[5/2] w-full grow animate-pulse">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={[]}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border-light)"
        />
        <XAxis tick={false} stroke="var(--color-border-light)" tickMargin={8} />
        <YAxis tick={false} stroke="var(--color-border-light)" tickMargin={4} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="flex flex-col gap-2 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex justify-between items-center py-1.5 px-1">
        <div className="h-4 bg-border-light rounded w-2/3" />
        <div className="h-4 bg-border-light rounded w-8" />
      </div>
    ))}
  </div>
);

const SubscribersChart = (props: {
  data: { day: string; total_subscribers: number }[];
  isLoading: boolean;
}) => {
  if (props.isLoading) {
    return <ChartSkeleton />;
  }
  if (props.data.length === 0) {
    return (
      <div className="aspect-[5/2] w-full border border-border grow flex items-center justify-center text-tertiary">
        No subscriber data
      </div>
    );
  }
  return (
    <div className="aspect-[5/2] w-full grow">
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
            minTickGap={40}
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
          <Tooltip isAnimationActive={false} />
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

const TrafficChart = (props: {
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

  if (props.isLoading) {
    return <ChartSkeleton />;
  }
  if (props.data.length === 0) {
    return (
      <div className="aspect-[5/2] w-full border border-border grow flex items-center justify-center text-tertiary">
        No traffic data
      </div>
    );
  }
  return (
    <div className="aspect-[5/2] w-full grow">
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
            interval="preserveStartEnd"
            minTickGap={40}
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
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              let pageviews =
                payload.find((p) => p.dataKey === "complete")?.value ??
                payload.find((p) => p.dataKey === "partial")?.value;
              return (
                <div className="rounded border border-border-light bg-white p-2 text-sm shadow-sm">
                  <div className="text-tertiary">
                    {formatDayTick(String(label))}
                  </div>
                  <div>{Number(pageviews).toLocaleString()} {metricLabel}</div>
                </div>
              );
            }}
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

const MetricToggle = (props: {
  metric: TrafficMetric;
  setMetric: (m: TrafficMetric) => void;
}) => {
  let options: { value: TrafficMetric; label: string }[] = [
    { value: "visitors", label: "Visitors" },
    { value: "pageviews", label: "Pageviews" },
  ];
  return (
    <div className="flex rounded-md border border-border-light text-sm overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => props.setMetric(opt.value)}
          className={`px-2 py-1 ${
            props.metric === opt.value
              ? "bg-accent-contrast text-white"
              : "bg-bg-page text-tertiary hover:text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

const PostSelector = (props: {
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
        <button className="text-tertiary">
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

const DateRangeSelector = (props: {
  pubStartDate: string | undefined;
  dateState: DateSelection;
  setDateState: (state: DateSelection) => void;
  showBackground?: boolean;
}) => {
  let { range: dateRange, preset: datePreset } = props.dateState;
  let buttonClass =
    "rounded-md px-1 text-sm border border-accent-contrast text-accent-contrast";

  let currentDate = new Date();

  let startDate = useLocalizedDate(
    dateRange.from?.toISOString() ||
      props.pubStartDate ||
      "2025-01-01T12:00:00.000Z",
    {
      month: "short",
      day: "numeric",
    },
  );

  let endDate = useLocalizedDate(
    (dateRange.to ?? currentDate).toISOString(),
    {
      month: "short",
      day: "numeric",
    },
  );

  return (
    <Popover
      className={"w-fit"}
      trigger={
        <div
          className={`w-36 text-center text-tertiary text-sm border border-border-light rounded-md px-2 py-1 hover:border-border ${props.showBackground ? "bg-bg-page" : ""}`}
        >
          {datePreset
            ? datePreset
            : dateRange.from === undefined
              ? "All Time"
              : `${startDate} - ${endDate}`}
        </div>
      }
    >
      <div className="flex gap-2 pt-1">
        <button
          onClick={() =>
            props.setDateState({
              range: { from: undefined, to: undefined },
              preset: "All Time",
            })
          }
          className={`${buttonClass}`}
        >
          All
        </button>
        <button
          onClick={() => {
            let from = new Date();
            from.setDate(from.getDate() - 7);
            props.setDateState({
              range: { from, to: new Date() },
              preset: "Last Week",
            });
          }}
          className={`${buttonClass}`}
        >
          Last Week
        </button>
        <button
          onClick={() => {
            let from = new Date();
            from.setMonth(from.getMonth() - 1);
            props.setDateState({
              range: { from, to: new Date() },
              preset: "Last Month",
            });
          }}
          className={`${buttonClass}`}
        >
          Last Month
        </button>
      </div>
      <hr className="my-2 border-border-light" />
      <DatePicker
        mode="range"
        selected={dateRange}
        onSelect={(range) => {
          if (range) props.setDateState({ range, preset: null });
        }}
        disabled={(date) => date > new Date()}
      />
    </Popover>
  );
};

const TopPages = (props: {
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
      <h4 className="text-sm font-bold text-tertiary pb-1">Top Pages</h4>
      <div className="h-64 overflow-y-auto">
        {props.isLoading && <ListSkeleton />}
        {!props.isLoading && props.pages.length === 0 && (
          <div className="text-tertiary text-sm">No page data</div>
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

const TopReferrors = (props: {
  refferors: ReferrerType[];
  setSelectedReferrer: (host: string | undefined) => void;
  selectedReferrer: string | undefined;
  isLoading: boolean;
}) => {
  return (
    <div className="topReferrors flex flex-col w-full">
      <h4 className="text-sm font-bold text-tertiary pb-1">Top Referrers</h4>
      <div className="h-64 overflow-y-auto">
        {props.isLoading && <ListSkeleton />}
        {!props.isLoading && props.refferors.length === 0 && (
          <div className="text-tertiary text-sm">No referrer data</div>
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
