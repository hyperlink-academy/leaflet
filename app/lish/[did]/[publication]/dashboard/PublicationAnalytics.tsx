import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { UpgradeContent } from "../UpgradeModal";
import { Popover } from "components/Popover";
import { DatePicker } from "components/DatePicker";
import { useMemo, useState } from "react";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import type { DateRange } from "react-day-picker";
import { usePublicationData } from "./PublicationSWRProvider";
import {
  Combobox,
  ComboboxResult,
  useComboboxState,
} from "components/Combobox";

type referrorType = { iconSrc: string; name: string; viewCount: string };
let refferors = [
  { iconSrc: "", name: "Bluesky", viewCount: "12k" },
  { iconSrc: "", name: "Reddit", viewCount: "1.2k" },
  { iconSrc: "", name: "X", viewCount: "583" },
  { iconSrc: "", name: "Google", viewCount: "12" },
];

export const PublicationAnalytics = () => {
  let isPro = true;

  let { data: publication } = usePublicationData();
  let [dateRange, setDateRange] = useState<DateRange>({ from: undefined });
  let [selectedPost, setSelectedPost] = useState<string | undefined>(undefined);
  let [selectedReferror, setSelectedReferror] = useState<
    referrorType | undefined
  >(undefined);

  if (!isPro)
    return (
      <div className="sm:mx-auto pt-4 s">
        <UpgradeContent />
      </div>
    );

  return (
    <div className="analytics flex flex-col gap-6">
      <div className="analyticsSubCount">
        <div className="flex gap-2 justify-between items-center">
          <h3>Subscribers</h3>
          <DateRangeSelector
            dateRange={dateRange}
            setDateRange={setDateRange}
            pubStartDate={publication?.publication?.indexed_at}
          />
        </div>
        <div className="aspect-video w-full border border-border grow" />
      </div>
      <div className="analyticsViewCount">
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
                <div className="text-tertiary"> {selectedReferror.name}</div>
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
          <div className="aspect-video w-full border border-border grow" />
          <TopReferrors
            refferors={refferors}
            setSelectedReferror={setSelectedReferror}
            selectedReferror={selectedReferror}
          />{" "}
        </div>
      </div>
    </div>
  );
};

const PostSelector = (props: {
  selectedPost: string | undefined;
  setSelectedPost: (s: string | undefined) => void;
}) => {
  let { data } = usePublicationData();
  let { documents } = data || {};

  let [highlighted, setHighlighted] = useState<string | undefined>(undefined);
  let [searchValue, setSearchValue] = useState<string>("");

  let open = useComboboxState((s) => s.open);
  let posts = documents?.map((doc) => doc.record.title);
  let filteredPosts = useMemo(
    () =>
      posts &&
      posts.filter((post) =>
        post.toLowerCase().includes(searchValue.toLowerCase()),
      ),
    [searchValue, posts],
  );

  let filteredPostsWithClear = ["All Posts", ...(filteredPosts || [])];

  return (
    <Combobox
      trigger={
        <button className="text-tertiary">
          {props.selectedPost ?? "All Posts"}
        </button>
      }
      results={filteredPostsWithClear || []}
      highlighted={highlighted}
      setHighlighted={setHighlighted}
      onSelect={() => {
        props.setSelectedPost(highlighted);
      }}
      sideOffset={2}
      searchValue={searchValue}
      setSearchValue={setSearchValue}
      showSearch
    >
      {filteredPostsWithClear.map((post) => {
        if (post === "All Posts")
          return (
            <>
              <ComboboxResult
                key="all posts"
                result={post}
                onSelect={() => {
                  props.setSelectedPost(undefined);
                }}
                highlighted={highlighted}
                setHighlighted={setHighlighted}
              >
                All Posts
              </ComboboxResult>
              {filteredPosts && filteredPosts.length !== 0 && (
                <hr className="mx-1 border-border-light" />
              )}
            </>
          );
        return (
          <ComboboxResult
            key={post}
            result={post}
            onSelect={() => {
              props.setSelectedPost(post);
            }}
            highlighted={highlighted}
            setHighlighted={setHighlighted}
          >
            {post}
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
  refferors: referrorType[];
  setSelectedReferror: (ref: referrorType) => void;
  selectedReferror: referrorType | undefined;
}) => {
  return (
    <div className="topReferrors flex flex-col gap-0.5 w-full sm:w-xs">
      {props.refferors.map((ref) => {
        let selected = ref === props.selectedReferror;
        return (
          <>
            <button
              key={ref.name}
              className={`w-full flex justify-between gap-4 px-1 items-center text-right rounded-md ${selected ? "text-accent-contrast bg-[var(--accent-light)]" : ""}`}
              onClick={() => {
                props.setSelectedReferror(ref);
              }}
            >
              <div className="flex gap-2 items-center grow">
                <img src={ref.iconSrc} className="h-4 w-4" aria-hidden />
                {ref.name}
              </div>
              {ref.viewCount}
            </button>
            <hr className="border-border-light last:hidden" />
          </>
        );
      })}
    </div>
  );
};
