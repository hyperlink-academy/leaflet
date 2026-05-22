"use client";

import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { PublishedPostsList } from "../PublishedPostsLists";
import { NewDraftActionButton } from "../NewDraftButton";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "../PublicationSWRProvider";

export default function PostsPage() {
  let { data } = usePublicationData();
  let record = useNormalizedPublicationRecord();
  let pubUri = data?.publication?.uri || "";

  let [searchValue, setSearchValue] = useState("");
  let [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  useDebouncedEffect(
    () => setDebouncedSearchValue(searchValue),
    200,
    [searchValue],
  );

  const showPageBackground = !!record?.theme?.showPageBackground;

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${pubUri}-Posts`}
      pageTitle="Posts"
      mobileActions={<NewDraftActionButton publication={pubUri} compact />}
      publication={pubUri}
      showHeader={false}
    >
      <PublishedPostsList
        searchValue={debouncedSearchValue}
        showPageBackground={showPageBackground}
      />
    </DashboardPageLayout>
  );
}
