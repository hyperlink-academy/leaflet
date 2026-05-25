import { Popover } from "components/Popover";
import { DatePicker } from "components/DatePicker";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import type { DateRange } from "react-day-picker";
import { useQueryState } from "src/hooks/useQueryState";
import { DateTimeBlock } from "components/Blocks/DateTimeBlock";
import { BlockCalendarSmall } from "components/Icons/BlockCalendarSmall";
import { CalendarTiny } from "components/Icons/CalendarTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { Separator } from "components/Layout";

type DatePreset = "Last Week" | "Last Month" | "All Time";
export type DateSelection = { range: DateRange; preset: DatePreset | null };

export function useAnalyticsDateState() {
  return useQueryState<DateSelection>({
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
      if (preset === "All Time") return { date: "all", from: null, to: null };
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
}

const dayTickFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

export function formatDayTick(value: string) {
  let d = new Date(value + "T00:00:00");
  if (isNaN(d.getTime())) return value;
  return dayTickFormatter.format(d);
}

export function formatYTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function niceYMax(dataMax: number): number {
  if (dataMax <= 0) return 10;
  let rough = dataMax / 4;
  let mag = Math.pow(10, Math.floor(Math.log10(rough)));
  let norm = rough / mag;
  let step =
    norm <= 1.5 ? mag : norm <= 3 ? 2 * mag : norm <= 7 ? 5 * mag : 10 * mag;
  return Math.ceil(dataMax / step) * step + step;
}

export function endOfDay(date: Date): Date {
  let d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function fillDailyGaps<T extends { day: string }>(
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

export const DateRangeSelector = (props: {
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

  let endDate = useLocalizedDate((dateRange.to ?? currentDate).toISOString(), {
    month: "short",
    day: "numeric",
  });

  return (
    <Popover
      className={"w-fit"}
      trigger={
        <div
          className={`flex flex-row gap-2 items-center  text-sm font-bold border border-border-light bg-bg-page rounded-md px-1 py-0.5 hover:border-border`}
        >
          <CalendarTiny />
          {datePreset
            ? datePreset
            : dateRange.from === undefined
              ? "All Time"
              : `${startDate} - ${endDate}`}

          <Separator />
          <ArrowDownTiny />
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
