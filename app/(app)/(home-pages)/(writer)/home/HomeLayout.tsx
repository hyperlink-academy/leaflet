"use client";

import { getHomeDocs } from "./storage";
import useSWR from "swr";
import { PermissionToken, useEntity } from "src/replicache";
import { LeafletListItem } from "./LeafletList/LeafletListItem";
import { useIdentityData } from "components/IdentityProvider";
import { StaticLeafletDataContext } from "components/PageSWRDataProvider";
import {
  type DashboardState,
  useDashboardState,
} from "components/PageLayouts/dashboardState";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { PageSearch } from "components/PageLayouts/PageSearch";
import { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { HomeEmptyState } from "./HomeEmpty/HomeEmpty";
import { CreateNewLeafletButton } from "./Actions/CreateNewButton";
import { LeafletCardReplicache } from "./LeafletList/LeafletCardReplicache";

export type Leaflet = {
  added_at: string;
  archived?: boolean | null;
  token: PermissionToken & {
    title?: string | null;
    description?: string | null;
    leaflets_in_publications?: Exclude<
      GetLeafletDataReturnType["result"]["data"],
      null
    >["leaflets_in_publications"];
    leaflets_to_documents?: Exclude<
      GetLeafletDataReturnType["result"]["data"],
      null
    >["leaflets_to_documents"];
  };
};

export const HomeContent = (props: {
  entityID: string | null;
  titles: { [root_entity: string]: string };
}) => {
  let hasBackgroundImage = !!useEntity(
    props.entityID,
    "theme/background-image",
  );

  let [searchValue, setSearchValue] = useState("");
  let [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  useDebouncedEffect(
    () => {
      setDebouncedSearchValue(searchValue);
    },
    200,
    [searchValue],
  );

  let { identity } = useIdentityData();

  let hasPubs =
    (identity?.publications.length ?? 0) > 0 ||
    (identity?.contributor_publications?.length ?? 0) > 0;
  let hasArchived =
    identity &&
    identity.permission_token_on_homepage.filter(
      (leaflet) => leaflet.archived === true,
    ).length > 0;

  return (
    <DashboardPageLayout
      scrollKey="dashboard-home"
      pageTitle="Home"
      mobileActions={<CreateNewLeafletButton compact />}
      controls={
        <PageSearch
          defaultDisplay={"grid"}
          searchValue={searchValue}
          setSearchValueAction={setSearchValue}
          hasBackgroundImage={hasBackgroundImage}
          hasPubs={hasPubs}
          hasArchived={!!hasArchived}
        />
      }
      hasSearch
      showHeader={true}
    >
      <HomeLeafletList
        titles={props.titles}
        searchValue={debouncedSearchValue}
      />
    </DashboardPageLayout>
  );
};

function HomeLeafletList(props: {
  titles: { [root_entity: string]: string };
  searchValue: string;
}) {
  let { identity } = useIdentityData();

  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });
  let leaflets: Leaflet[];
  if (identity) {
    let owned = identity.permission_token_on_homepage.map((ptoh) => ({
      added_at: ptoh.created_at,
      token: ptoh.permission_tokens as PermissionToken,
      archived: ptoh.archived,
    }));
    let ownedIds = new Set(owned.map((l) => l.token.id));
    let contributed = (identity.contributor_leaflets ?? [])
      .filter((row) => !ownedIds.has(row.permission_tokens.id))
      .map((row) => ({
        added_at: row.created_at,
        token: row.permission_tokens as unknown as PermissionToken,
        archived: false,
      }));
    leaflets = [...owned, ...contributed];
  } else {
    leaflets = localLeaflets
      .sort((a, b) => (a.added_at > b.added_at ? -1 : 1))
      .filter((d) => !d.hidden);
  }

  return leaflets.length === 0 ? (
    <HomeEmptyState />
  ) : (
    <>
      <LeafletList
        defaultDisplay="grid"
        searchValue={props.searchValue}
        leaflets={leaflets}
        titles={props.titles}
        showPreview
      />
      <div className="spacer sm:block hidden h-4 w-full bg-transparent shrink-0 " />
    </>
  );
}

export function LeafletList(props: {
  leaflets: Leaflet[];
  titles: { [root_entity: string]: string };
  defaultDisplay: Exclude<DashboardState["display"], undefined>;
  searchValue: string;
  showPreview?: boolean;
}) {
  let { identity } = useIdentityData();
  let { display } = useDashboardState();

  display = display || props.defaultDisplay;

  let searchedLeaflets = useSearchedLeaflets(
    props.leaflets,
    props.titles,
    props.searchValue,
  );

  return (
    <div
      className={`
        leafletList
        w-full
        ${display === "grid" ? "grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-6 sm:gap-y-5 grow" : "flex flex-col gap-2"} `}
    >
      {props.leaflets.map(({ token: leaflet, added_at, archived }, index) => (
        <LeafletCardReplicache
          key={leaflet.id}
          leaflet={leaflet}
          loggedIn={!!identity}
          eagerLoadFacts={index < 12}
        >
          <StaticLeafletDataContext
            value={{
              ...leaflet,
              title: leaflet.title ?? null,
              description: leaflet.description ?? null,
              leaflets_in_publications: leaflet.leaflets_in_publications || [],
              leaflets_to_documents: leaflet.leaflets_to_documents || [],
              publication_pages: [],
              blocked_by_admin: null,
              custom_domain_routes: [],
            }}
          >
            <LeafletListItem
              title={props?.titles?.[leaflet.root_entity]}
              archived={archived}
              loggedIn={!!identity}
              display={display}
              added_at={added_at}
              index={index}
              showPreview={props.showPreview}
              isHidden={
                !searchedLeaflets.some(
                  (sl) => sl.token.root_entity === leaflet.root_entity,
                )
              }
            />
          </StaticLeafletDataContext>
        </LeafletCardReplicache>
      ))}
    </div>
  );
}

function useSearchedLeaflets(
  leaflets: Leaflet[],
  titles: { [root_entity: string]: string },
  searchValue: string,
) {
  let { sort, filter } = useDashboardState();

  let sortedLeaflets = leaflets.sort((a, b) => {
    if (sort === "alphabetical") {
      let titleA = titles[a.token.root_entity] ?? "Untitled";
      let titleB = titles[b.token.root_entity] ?? "Untitled";

      if (titleA === titleB) {
        return a.added_at > b.added_at ? -1 : 1;
      } else {
        return titleA.toLocaleLowerCase() > titleB.toLocaleLowerCase() ? 1 : -1;
      }
    } else {
      return a.added_at === b.added_at
        ? a.token.root_entity > b.token.root_entity
          ? -1
          : 1
        : a.added_at > b.added_at
          ? -1
          : 1;
    }
  });

  let filteredLeaflets = sortedLeaflets.filter(
    ({ token: leaflet, archived: archived }) => {
      let published =
        !!leaflet.leaflets_in_publications?.find((l) => l.doc) ||
        !!leaflet.leaflets_to_documents?.find((l) => l.document);
      let drafts = !!leaflet.leaflets_in_publications?.length && !published;
      let docs = !leaflet.leaflets_in_publications?.length && !archived;

      // If no filters are active, show everything that is not archived
      if (
        !filter.drafts &&
        !filter.published &&
        !filter.docs &&
        !filter.archived
      )
        return archived === false || archived === null || archived == undefined;

      //if a filter is on, return itemsd of that filter that are also NOT archived
      return (
        (filter.drafts && drafts && !archived) ||
        (filter.published && published && !archived) ||
        (filter.docs && docs && !archived) ||
        (filter.archived && archived)
      );
    },
  );
  if (searchValue === "") return filteredLeaflets;
  let searchedLeaflets = filteredLeaflets.filter(({ token: leaflet }) => {
    return titles[leaflet.root_entity]
      ?.toLowerCase()
      .includes(searchValue.toLowerCase());
  });

  return searchedLeaflets;
}
