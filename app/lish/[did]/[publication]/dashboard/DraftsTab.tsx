"use client";

import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { DraftList } from "./DraftList";
import { NewDraftActionButton } from "./NewDraftButton";
import { PageSearch } from "components/PageLayouts/PageSearch";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "./PublicationSWRProvider";

export function DraftsTab() {
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
      scrollKey={`dashboard-${pubUri}-Drafts`}
      pageTitle="Drafts"
      mobileActions={<NewDraftActionButton publication={pubUri} compact />}
      search={
        <PageSearch
          defaultDisplay="list"
          hasBackgroundImage={!!record?.theme?.backgroundImage}
          searchValue={searchValue}
          setSearchValueAction={setSearchValue}
        />
      }
      publication={pubUri}
      showHeader={true}
    >
      <DraftList
        searchValue={debouncedSearchValue}
        showPageBackground={showPageBackground}
      />
    </DashboardPageLayout>
  );
}
