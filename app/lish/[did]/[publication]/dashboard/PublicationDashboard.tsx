"use client";

import { DraftList } from "./DraftList";
import { GetPublicationDataReturnType } from "app/api/rpc/[command]/get_publication_data";
import { Actions } from "./Actions";
import React, { useState } from "react";
import { PublishedPostsList } from "./PublishedPostsLists";
import { PublicationSubscribers } from "./PublicationSubscribers";
import {
  DashboardLayout,
  PageTitle,
  PublicationDashboardControls,
} from "components/PageLayouts/DashboardLayout";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { PublicationButtons } from "components/ActionBar/Publications";
import { Popover } from "components/Popover";

export default function PublicationDashboard({
  publication,
  record,
}: {
  record: NormalizedPublication;
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
      pageTitle={
        <PageTitle
          pageTitle={record.name}
          controls={
            <Popover trigger={<div>pubs</div>} className="pt-1 px-2!">
              <PublicationButtons
                currentPage={"pub"}
                currentPubUri={publication.uri}
                className="justify-end!"
                optionClassName=" flex-row-reverse!"
              />
            </Popover>
          }
        />
      }
    />
  );
}
