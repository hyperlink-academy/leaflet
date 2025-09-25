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
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { PublicationSettings } from "./PublicationSettings";

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
      hasBackgroundImage={!!record?.theme?.backgroundImage}
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
          content: <PublishedPostsList searchValue={debouncedSearchValue} />,
          controls: null,
        },
        Subscribers: {
          content: <PublicationSubscribers />,
          controls: null,
        },
        Settings: {
          content: <PublicationSettings />,
          controls: null,
          label: <SettingsSmall />,
        },
      }}
      actions={<Actions publication={publication.uri} />}
      currentPage="pub"
      publication={publication.uri}
    />
  );
}
