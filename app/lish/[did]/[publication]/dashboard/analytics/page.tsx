"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { PublicationAnalytics } from "../PublicationAnalytics";
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
      showHeader={false}
    >
      <PublicationAnalytics showPageBackground={showPageBackground} />
    </DashboardPageLayout>
  );
}
