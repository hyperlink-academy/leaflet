import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { UpgradeContent } from "../../UpgradeModal";
import { useCallback, useMemo } from "react";
import { useQueryState } from "src/hooks/useQueryState";
import { usePublicationData } from "../PublicationSWRProvider";
import { useIsPro, useCanSeePro } from "src/hooks/useEntitlement";
import { callRPC } from "app/api/rpc/client";
import useSWR from "swr";
import { DateSelection, endOfDay, fillDailyGaps } from "./dates";
import {
  MetricToggle,
  PostSelector,
  TopPages,
  TopReferrors,
  TrafficChart,
  TrafficMetric,
} from "./TrafficChart";
import { SubscribersChart } from "./SubscribersChart";

export const PublicationAnalytics = (props: {
  showPageBackground: boolean;
  dateState: DateSelection;
}) => {
  let isPro = useIsPro();
  let canSeePro = useCanSeePro();

  let { data: publication } = usePublicationData();

  let { dateState } = props;
  let { range: dateRange } = dateState;

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
        className={`sm:mx-auto mt-2 sm:mt-4 rounded-lg border ${
          props.showPageBackground
            ? "border-border-light px-4 py-3"
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
    <div className="analytics flex flex-col sm:pb-0 pb-4 gap-4">
      <div
        className={`analyticsViewCount rounded-lg border ${
          props.showPageBackground
            ? "border-border-light sm:px-4 sm:py-3 py-2 px-3"
            : "border-transparent"
        }`}
        style={{
          backgroundColor: props.showPageBackground
            ? "rgba(var(--bg-page), var(--bg-page-alpha))"
            : "transparent",
        }}
      >
        <div className="flex items-start sm:items-center gap-2 pb-2 w-full">
          <div className="w-full min-w-0 flex sm:flex-row flex-col place-items-start sm:items-center gap-0 sm:gap-2 grow">
            <div className="flex justify-between sm:w-fit w-full">
              <h3>Traffic</h3>
              <div className="sm:hidden block">
                <MetricToggle
                  metric={trafficMetric}
                  setMetric={setTrafficMetric}
                />
              </div>
            </div>
            <div className="w-full min-w-0 flex flex-row items-center gap-2">
              <ArrowRightTiny className="sm:block hidden text-border shrink-0 " />
              <PostSelector
                selectedPost={selectedPost}
                setSelectedPost={setSelectedPost}
              />
              {selectedReferrer && (
                <>
                  <ArrowRightTiny className="text-border shrink-0" />
                  <div className="text-tertiary min-w-24 truncate">
                    {selectedReferrer} hello this is reddit
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="sm:block hidden shrink-0">
            <MetricToggle metric={trafficMetric} setMetric={setTrafficMetric} />
          </div>
        </div>
        <TrafficChart
          data={filledTraffic}
          isLoading={analyticsLoading}
          metric={trafficMetric}
        />
        <hr className="mt-2 mb-4 border-border-light " />
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
            ? "border-border-light sm:px-4 sm:py-3 py-2 px-3"
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
