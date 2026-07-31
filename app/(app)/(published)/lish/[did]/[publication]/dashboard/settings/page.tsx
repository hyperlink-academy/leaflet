"use client";

import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { SettingsContent } from "./SettingsContent";
import { NewDraftActionButton } from "../NewDraftButton";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";

export default function SettingsPage() {
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let pubUri = data?.publication?.uri || "";
  const showPageBackground = !!record?.theme?.showPageBackground;

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${pubUri}-Settings`}
      pageTitle="Settings"
      mobileActions={<NewDraftActionButton publication={pubUri} compact />}
      publication={pubUri}
      showHeader={false}
    >
      <SettingsContent showPageBackground={showPageBackground} />
    </DashboardPageLayout>
  );
}
