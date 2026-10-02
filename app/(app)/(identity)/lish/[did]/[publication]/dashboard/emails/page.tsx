"use client";

import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { NewEmailButton } from "../NewDraftButton";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";
import { EmailPostsList } from "./EmailPostsList";

export default function EmailsPage() {
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let pubUri = data?.publication?.uri || "";

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${pubUri}-Emails`}
      pageTitle="Emails"
      mobileActions={<NewEmailButton publication={pubUri} compact />}
      publication={pubUri}
      showHeader={false}
    >
      <EmailPostsList
        showPageBackground={!!record?.theme?.showPageBackground}
      />
    </DashboardPageLayout>
  );
}
