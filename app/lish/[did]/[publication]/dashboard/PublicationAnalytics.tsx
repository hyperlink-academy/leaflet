import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { UpgradeContent } from "../UpgradeModal";
import { Popover } from "components/Popover";
import { DatePicker } from "components/DatePicker";
import { useState } from "react";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import type { DateRange } from "react-day-picker";
import { usePublicationData } from "./PublicationSWRProvider";

export const PublicationAnalytics = () => {
  let isPro = true;

  let { data: publication } = usePublicationData();
  let [dateRange, setDateRange] = useState<DateRange>({ from: undefined });

  if (!isPro)
    return (
      <div className="sm:mx-auto pt-4 s">
        <UpgradeContent />
      </div>
    );

  return (
    <div className="analytics">
      <div className="analyticsViewCount">
        <div className="flex justify-between items-center gap-2 pb-2 w-full">
          <div className="flex gap-2 items-center">
            <h3>Traffic</h3>
            <ArrowRightTiny /> <PostSelector />
          </div>
          <DateRangeSelector
            dateRange={dateRange}
            setDateRange={setDateRange}
            pubStartDate={publication?.publication?.indexed_at}
          />
        </div>
        <div className="aspect-video w-full border border-border" />
      </div>

      {/*<div>subscriber count over time</div>
        <div>Top Referrers</div>*/}
    </div>
  );
};

const PostSelector = () => {
  return <div>Total</div>;
};

const DateRangeSelector = (props: {
  pubStartDate: string | undefined;
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;
}) => {
  let buttonClass =
    "rounded-md px-1 text-sm border border-accent-contrast text-accent-contrast";

  let currentDate = new Date();

  console.log("dateRange" + props.dateRange.from?.toISOString());
  console.log("pubstart" + props.pubStartDate);

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
