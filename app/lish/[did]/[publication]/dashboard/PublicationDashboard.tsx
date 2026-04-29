"use client";

import { DraftList } from "./DraftList";
import { GetPublicationDataReturnType } from "app/api/rpc/[command]/get_publication_data";
import { Actions } from "./Actions";
import React, { useState } from "react";
import { PublishedPostsList } from "./PublishedPostsLists";
import { PublicationSubscribers } from "./PublicationSubscribers";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { PublicationAnalytics } from "./PublicationAnalytics";
import { useCanSeePro } from "src/hooks/useEntitlement";
import { SettingsContent } from "./settings/SettingsContent";
import { SettingsTiny } from "components/Icons/SettingsTiny";
import { PageSearch } from "components/PageLayouts/PageSearch";
import { PubIcon } from "components/ActionBar/Publications";
import { PageTitle } from "components/ActionBar/DesktopNavigation";

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
  let canSeePro = useCanSeePro();
  let [searchValue, setSearchValue] = useState("");
  let [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  useDebouncedEffect(
    () => {
      setDebouncedSearchValue(searchValue);
    },
    200,
    [searchValue],
  );

  const pubUri = publication.uri;
  const showPageBackground = !!record.theme?.showPageBackground;

  return (
    <DashboardLayout
      id={pubUri}
      defaultTab="Drafts"
      actions={<Actions publication={pubUri} />}
      currentPage="pub"
      publication={pubUri}
      pageTitle={
        <PageTitle
          pageTitle={record.name}
          icon={<PubIcon small uri={pubUri} record={record} />}
        />
      }
      tabs={{
        Drafts: {
          content: (
            <DashboardPageLayout
              scrollKey={`dashboard-${pubUri}-Drafts`}
              pageTitle="Drafts"
              actions={<Actions publication={pubUri} />}
              controls={
                <PageSearch
                  defaultDisplay={"list"}
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
          ),
        },
        Posts: {
          content: (
            <DashboardPageLayout
              scrollKey={`dashboard-${pubUri}-Posts`}
              pageTitle={"Posts"}
              actions={<Actions publication={pubUri} />}
              publication={pubUri}
              showHeader={false}
            >
              <PublishedPostsList
                searchValue={debouncedSearchValue}
                showPageBackground={showPageBackground}
              />
            </DashboardPageLayout>
          ),
        },
        Subs: {
          content: (
            <DashboardPageLayout
              scrollKey={`dashboard-${pubUri}-Subs`}
              pageTitle={"Subscribers"}
              actions={<Actions publication={pubUri} />}
              publication={pubUri}
              showHeader={false}
            >
              <PublicationSubscribers showPageBackground={showPageBackground} />
            </DashboardPageLayout>
          ),
        },
        ...(canSeePro
          ? {
              Analytics: {
                content: (
                  <DashboardPageLayout
                    scrollKey={`dashboard-${pubUri}-Analytics`}
                    pageTitle={"Analytics"}
                    actions={<Actions publication={pubUri} />}
                    publication={pubUri}
                    showHeader={false}
                  >
                    <PublicationAnalytics
                      showPageBackground={showPageBackground}
                    />
                  </DashboardPageLayout>
                ),
              },
            }
          : {}),
        Settings: {
          icon: <SettingsTiny />,
          content: (
            <DashboardPageLayout
              scrollKey={`dashboard-${pubUri}-Settings`}
              pageTitle={"Settings"}
              actions={<Actions publication={pubUri} />}
              publication={pubUri}
              showHeader={false}
            >
              <SettingsContent showPageBackground={showPageBackground} />
            </DashboardPageLayout>
          ),
        },
      }}
    />
  );
}
