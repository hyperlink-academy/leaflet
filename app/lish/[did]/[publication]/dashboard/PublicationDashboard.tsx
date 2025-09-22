"use client";

import { DraftList } from "./DraftList";
import {
  get_publication_data,
  GetPublicationDataReturnType,
} from "app/api/rpc/[command]/get_publication_data";
import { Actions } from "./Actions";
import React, { useState } from "react";
import { PublishedPostsList } from "./PublishedPostsLists";
import { PubLeafletPublication } from "lexicons/api";
import { PublicationSubscribers } from "./PublicationSubscribers";
import { AtUri } from "@atproto/syntax";
import {
  HomeDashboardControls,
  DashboardLayout,
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
      defaultDisplay="list"
      id={publication.uri}
      hasBackgroundImage={!!record?.theme?.backgroundImage}
      defaultTab="Drafts"
      tabs={{
        Drafts: {
          content: <DraftList searchValue={debouncedSearchValue} />,
          controls: (
            <HomeDashboardControls
              defaultDisplay={"list"}
              showFilter
              hasBackgroundImage={!!record?.theme?.backgroundImage}
              searchValue={searchValue}
              setSearchValueAction={setSearchValue}
            />
          ),
        },
        Published: {
          content: <PublishedPostsList searchValue={debouncedSearchValue} />,
          controls: null,
        },
        Subscribers: {
          content: <PublicationSubscribers />,
          controls: null,
        },
      }}
      actions={<Actions publication={publication.uri} />}
      currentPage="pub"
      publication={publication.uri}
    />
  );
}
