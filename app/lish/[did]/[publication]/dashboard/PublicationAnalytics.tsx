import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { UpgradeContent } from "../UpgradeModal";
import { Popover } from "components/Popover";
import { DatePicker } from "components/DatePicker";
import { useMemo, useState } from "react";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import type { DateRange } from "react-day-picker";
import { usePublicationData } from "./PublicationSWRProvider";
import { Combobox, ComboboxResult } from "components/Combobox";
import { useIsPro } from "src/hooks/useEntitlement";
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

function fillDailyGaps<T extends { day: string }>(
  data: T[],
  fill: (day: string) => T,
  from?: Date,
  to?: Date,
): T[] {
  let start =
    from || (data.length > 0 ? new Date(data[0].day) : null);
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

  let { data: publication } = usePublicationData();
  let [dateRange, setDateRange] = useState<DateRange>({ from: undefined });
  let [selectedPost, setSelectedPost] = useState<
    { title: string; path: string } | undefined
  >(undefined);
  let [selectedReferror, setSelectedReferror] = useState<
    ReferrerType | undefined
  >(undefined);

  let publicationUri = publication?.publication?.uri;

  let { data: analyticsData } = useSWR(
    publicationUri
      ? [
          "publication-analytics",
          publicationUri,
          dateRange.from?.toISOString(),
          dateRange.to?.toISOString(),
          selectedPost?.path,
        ]
      : null,
    async () => {
      let res = await callRPC("get_publication_analytics", {
        publication_uri: publicationUri!,
        ...(dateRange.from ? { from: dateRange.from.toISOString() } : {}),
        ...(dateRange.to ? { to: dateRange.to.toISOString() } : {}),
        ...(selectedPost ? { path: `/${selectedPost.path}` } : {}),
      });
      return res?.result;
    },
  );

  let { data: subscribersData } = useSWR(
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
        ...(dateRange.to ? { to: dateRange.to.toISOString() } : {}),
      });
      return res?.result;
    },
  );

  let filledTraffic = useMemo(
    () =>
      fillDailyGaps(
        analyticsData?.traffic || [],
        (day) => ({ day, pageviews: 0 }),
        dateRange.from,
        dateRange.to,
      ),
    [analyticsData?.traffic, dateRange.from, dateRange.to],
  );

  if (!isPro)
    return (
      <div className="sm:mx-auto pt-4 s">
        <UpgradeContent />
      </div>
    );

  return (
    <div className="analytics flex flex-col gap-6">
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
        <div className="flex gap-2 justify-between items-center">
          <h3>Subscribers</h3>
          <DateRangeSelector
            dateRange={dateRange}
            setDateRange={setDateRange}
            pubStartDate={publication?.publication?.indexed_at}
          />
        </div>
        <SubscribersChart data={subscribersData?.timeseries || []} />
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
        <div className="flex justify-between items-center gap-2 pb-2 w-full">
          <div className="flex gap-2 items-center">
            <h3>Traffic</h3>
            <ArrowRightTiny className="text-border" />
            <PostSelector
              selectedPost={selectedPost}
              setSelectedPost={setSelectedPost}
            />
            {selectedReferror && (
              <>
                <ArrowRightTiny className="text-border" />
                <div className="text-tertiary">
                  {" "}
                  {selectedReferror.referrer_host}
                </div>
              </>
            )}
          </div>
          <DateRangeSelector
            dateRange={dateRange}
            setDateRange={setDateRange}
            pubStartDate={publication?.publication?.indexed_at}
          />
        </div>
        <div className="flex gap-2">
          <TrafficChart data={filledTraffic} />
          <TopReferrors
            refferors={analyticsData?.topReferrers || []}
            setSelectedReferror={setSelectedReferror}
            selectedReferror={selectedReferror}
          />{" "}
        </div>
      </div>
    </div>
  );
};

const SubscribersChart = (props: {
  data: { day: string; total_subscribers: number }[];
}) => {
  if (props.data.length === 0) {
    return (
      <div className="aspect-video w-full border border-border grow flex items-center justify-center text-tertiary">
        No subscriber data
      </div>
    );
  }
  return (
    <div className="aspect-video w-full grow">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={props.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--tertiary)" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--tertiary)"
            allowDecimals={false}
          />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="total_subscribers"
            name="Subscribers"
            stroke="var(--accent-contrast)"
            fill="var(--accent-contrast)"
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TrafficChart = (props: {
  data: { day: string; pageviews: number }[];
}) => {
  if (props.data.length === 0) {
    return (
      <div className="aspect-video w-full border border-border grow flex items-center justify-center text-tertiary">
        No traffic data
      </div>
    );
  }
  return (
    <div className="aspect-video w-full grow">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={props.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--tertiary)" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--tertiary)"
            allowDecimals={false}
          />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="pageviews"
            name="Pageviews"
            stroke="var(--accent-contrast)"
            fill="var(--accent-contrast)"
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
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
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;
}) => {
  let buttonClass =
    "rounded-md px-1 text-sm border border-accent-contrast text-accent-contrast";

  let currentDate = new Date();

  let startDate = useLocalizedDate(
    props.dateRange.from?.toISOString() ||
      props.pubStartDate ||
      "2025-01-01T12:00:00.000Z",
    {
      month: "short",
      day: "numeric",
    },
  );

  let endDate = useLocalizedDate(
    (props.dateRange.to ?? currentDate).toISOString(),
    {
      month: "short",
      day: "numeric",
    },
  );

  function handleDateChange(range: DateRange | undefined) {
    if (range) props.setDateRange(range);
  }

  return (
    <Popover
      className={"w-fit"}
      trigger={
        <div className="text-tertiary ml-0">
          {props.dateRange.from === undefined
            ? "All Time"
            : `${startDate} - ${endDate}`}
        </div>
      }
    >
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            props.setDateRange({ from: undefined, to: undefined });
          }}
          className={`${buttonClass}`}
        >
          All
        </button>
        <button
          onClick={() => {
            let from = new Date();
            from.setDate(from.getDate() - 7);
            props.setDateRange({ from, to: new Date() });
          }}
          className={`${buttonClass}`}
        >
          Last Week
        </button>
        <button
          onClick={() => {
            let from = new Date();
            from.setMonth(from.getMonth() - 1);
            props.setDateRange({ from, to: new Date() });
          }}
          className={`${buttonClass}`}
        >
          Last Month
        </button>
      </div>
      <hr className="my-2 border-border-light" />
      <DatePicker
        mode="range"
        selected={props.dateRange}
        onSelect={handleDateChange}
        disabled={(date) => date > new Date()}
      />
    </Popover>
  );
};

const TopReferrors = (props: {
  refferors: ReferrerType[];
  setSelectedReferror: (ref: ReferrerType) => void;
  selectedReferror: ReferrerType | undefined;
}) => {
  return (
    <div className="topReferrors flex flex-col gap-0.5 w-full sm:w-xs">
      {props.refferors.map((ref) => {
        let selected = ref === props.selectedReferror;
        return (
          <>
            <button
              key={ref.referrer_host}
              className={`w-full flex justify-between gap-4 px-1 items-center text-right rounded-md ${selected ? "text-accent-contrast bg-[var(--accent-light)]" : ""}`}
              onClick={() => {
                props.setSelectedReferror(ref);
              }}
            >
              <div className="flex gap-2 items-center grow">
                {ref.referrer_host}
              </div>
              {ref.pageviews.toLocaleString()}
            </button>
            <hr className="border-border-light last:hidden" />
          </>
        );
      })}
    </div>
  );
};
