"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import {
  PublicationAnalytics,
  DateRangeSelector,
  useAnalyticsDateState,
} from "../PublicationAnalytics";
import { NewDraftActionButton } from "../NewDraftButton";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";
import { useCanSeePro } from "src/hooks/useEntitlement";

export default function AnalyticsPage() {
  let canSeePro = useCanSeePro();
  let router = useRouter();
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let pubUri = data?.publication?.uri || "";
  const showPageBackground = !!record?.theme?.showPageBackground;

  let [dateState, setDateState] = useAnalyticsDateState();

  useEffect(() => {
    if (canSeePro === false) router.replace("../");
  }, [canSeePro, router]);

  if (!canSeePro) return null;

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${pubUri}-Analytics`}
      pageTitle="Analytics"
      mobileActions={<NewDraftActionButton publication={pubUri} compact />}
      publication={pubUri}
      showHeader={true}
      controls={
        <div className="flex justify-end gap-2">
          <DateRangeSelector
            dateState={dateState}
            setDateState={setDateState}
            pubStartDate={data?.publication?.indexed_at}
            showBackground={showPageBackground}
          />
        </div>
      }
    >
      <PublicationAnalytics
        showPageBackground={showPageBackground}
        dateState={dateState}
      />
    </DashboardPageLayout>
  );
}
