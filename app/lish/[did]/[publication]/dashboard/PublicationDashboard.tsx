"use client";

import { DraftList } from "./DraftList";
import { GetPublicationDataReturnType } from "app/api/rpc/[command]/get_publication_data";
import { Actions } from "./Actions";
import React, { useState } from "react";
import { PublishedPostsList } from "./PublishedPostsLists";
import { PubLeafletPublication } from "lexicons/api";
import { PublicationSubscribers } from "./PublicationSubscribers";
import { AtUri } from "@atproto/syntax";
import {
  HomeDashboardControls,
  DashboardLayout,
  PublicationDashboardControls,
} from "components/PageLayouts/DashboardLayout";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";

export default function PublicationDashboard({
  publication,
  record,
}: {
  record: PubLeafletPublication.Record;
  publication: Exclude<
    GetPublicationDataReturnType["result"]["publication"],
    null
  >;
}) {
  let [searchValue, setSearchValue] = useState("");
  let [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  useDebouncedEffect(
    () => {
      setDebouncedSearchValue(searchValue);
    },
    200,
    [searchValue],
  );

  return (
    <DashboardLayout
      id={publication.uri}
      cardBorderHidden={!!record.theme?.showPageBackground}
      defaultTab="Drafts"
      tabs={{
        Drafts: {
          content: (
            <DraftList
              searchValue={debouncedSearchValue}
              showPageBackground={!!record.theme?.showPageBackground}
            />
          ),
          controls: (
            <PublicationDashboardControls
              defaultDisplay={"list"}
              hasBackgroundImage={!!record?.theme?.backgroundImage}
              searchValue={searchValue}
              setSearchValueAction={setSearchValue}
            />
          ),
        },
        Published: {
          content: (
            <PublishedPostsList
              searchValue={debouncedSearchValue}
              showPageBackground={!!record.theme?.showPageBackground}
            />
          ),
          controls: null,
        },
        Subscribers: {
          content: (
            <PublicationSubscribers
              showPageBackground={!!record.theme?.showPageBackground}
            />
          ),
          controls: null,
        },
      }}
      actions={<Actions publication={publication.uri} />}
      currentPage="pub"
      publication={publication.uri}
    />
  );
}
