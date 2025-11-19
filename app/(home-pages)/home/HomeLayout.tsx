"use client";

import { getHomeDocs } from "./storage";
import useSWR from "swr";
import {
  Fact,
  PermissionToken,
  ReplicacheProvider,
  useEntity,
} from "src/replicache";
import { LeafletListItem } from "./LeafletList/LeafletListItem";
import { useIdentityData } from "components/IdentityProvider";
import type { Attribute } from "src/replicache/attributes";
import { callRPC } from "app/api/rpc/client";
import { StaticLeafletDataContext } from "components/PageSWRDataProvider";
import {
  HomeDashboardControls,
  DashboardLayout,
  DashboardState,
  useDashboardState,
} from "components/PageLayouts/DashboardLayout";
import { Actions } from "./Actions/Actions";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { useTemplateState } from "./Actions/CreateNewButton";
import { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import {
  DiscoverBanner,
  HomeEmptyState,
  PublicationBanner,
} from "./HomeEmpty/HomeEmpty";

type Leaflet = {
  added_at: string;
  archived?: boolean | null;
  token: PermissionToken & {
    leaflets_in_publications?: Exclude<
      GetLeafletDataReturnType["result"]["data"],
      null
    >["leaflets_in_publications"];
  };
};

export const HomeLayout = (props: {
  entityID: string | null;
  titles: { [root_entity: string]: string };
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
}) => {
  let hasBackgroundImage = !!useEntity(
    props.entityID,
    "theme/background-image",
  );
  let cardBorderHidden = !!useCardBorderHidden(props.entityID);

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

  let hasPubs = !identity || identity.publications.length === 0 ? false : true;
  let hasTemplates =
    useTemplateState((s) => s.templates).length === 0 ? false : true;

  return (
    <DashboardLayout
      id="home"
      cardBorderHidden={cardBorderHidden}
      currentPage="home"
      defaultTab="home"
      actions={<Actions />}
      tabs={{
        home: {
          controls: (
            <HomeDashboardControls
              defaultDisplay={"grid"}
              searchValue={searchValue}
              setSearchValueAction={setSearchValue}
              hasBackgroundImage={hasBackgroundImage}
              hasPubs={hasPubs}
              hasTemplates={hasTemplates}
            />
          ),
          content: (
            <HomeLeafletList
              titles={props.titles}
              initialFacts={props.initialFacts}
              cardBorderHidden={cardBorderHidden}
              searchValue={debouncedSearchValue}
            />
          ),
        },
      }}
    />
  );
};

export function HomeLeafletList(props: {
  titles: { [root_entity: string]: string };
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  searchValue: string;
  cardBorderHidden: boolean;
}) {
  let { identity } = useIdentityData();
  let { data: initialFacts } = useSWR(
    "home-leaflet-data",
    async () => {
      if (identity) {
        let { result } = await callRPC("getFactsFromHomeLeaflets", {
          tokens: identity.permission_token_on_homepage.map(
            (ptrh) => ptrh.permission_tokens.root_entity,
          ),
        });
        let titles = {
          ...result.titles,
          ...identity.permission_token_on_homepage.reduce(
            (acc, tok) => {
              let title =
                tok.permission_tokens.leaflets_in_publications[0]?.title;
              if (title) acc[tok.permission_tokens.root_entity] = title;
              return acc;
            },
            {} as { [k: string]: string },
          ),
        };
        return { ...result, titles };
      }
    },
    { fallbackData: { facts: props.initialFacts, titles: props.titles } },
  );

  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });
  let leaflets: Leaflet[] = identity
    ? identity.permission_token_on_homepage.map((ptoh) => ({
        added_at: ptoh.created_at,
        token: ptoh.permission_tokens as PermissionToken,
        archived: ptoh.archived,
      }))
    : localLeaflets
        .sort((a, b) => (a.added_at > b.added_at ? -1 : 1))
        .filter((d) => !d.hidden)
        .map((ll) => ll);

  return leaflets.length === 0 ? (
    <HomeEmptyState />
  ) : (
    <>
      <LeafletList
        defaultDisplay="grid"
        searchValue={props.searchValue}
        leaflets={leaflets}
        titles={initialFacts?.titles || {}}
        cardBorderHidden={props.cardBorderHidden}
        initialFacts={initialFacts?.facts || {}}
        showPreview
      />
      <div className="spacer h-4 w-full bg-transparent shrink-0 " />

      {leaflets.filter((l) => !!l.token.leaflets_in_publications).length ===
        0 && <PublicationBanner small />}
      <DiscoverBanner small />
    </>
  );
}

export function LeafletList(props: {
  leaflets: Leaflet[];
  titles: { [root_entity: string]: string };
  defaultDisplay: Exclude<DashboardState["display"], undefined>;
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  searchValue: string;
  cardBorderHidden: boolean;
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
        ${display === "grid" ? "grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-6 sm:gap-y-5 grow" : "flex flex-col gap-2 pt-2"} `}
    >
      {props.leaflets.map(({ token: leaflet, added_at, archived }, index) => (
        <ReplicacheProvider
          disablePull
          initialFactsOnly={!!identity}
          key={leaflet.id}
          rootEntity={leaflet.root_entity}
          token={leaflet}
          name={leaflet.root_entity}
          initialFacts={props.initialFacts?.[leaflet.root_entity] || []}
        >
          <StaticLeafletDataContext
            value={{
              ...leaflet,
              leaflets_in_publications: leaflet.leaflets_in_publications || [],
              blocked_by_admin: null,
              custom_domain_routes: [],
            }}
          >
            <LeafletListItem
              title={props?.titles?.[leaflet.root_entity] || "Untitled"}
              archived={archived}
              token={leaflet}
              draft={!!leaflet.leaflets_in_publications?.length}
              published={!!leaflet.leaflets_in_publications?.find((l) => l.doc)}
              publishedAt={
                leaflet.leaflets_in_publications?.find((l) => l.doc)?.documents
                  ?.indexed_at
              }
              document_uri={
                leaflet.leaflets_in_publications?.find((l) => l.doc)?.documents
                  ?.uri
              }
              leaflet_id={leaflet.root_entity}
              loggedIn={!!identity}
              display={display}
              added_at={added_at}
              cardBorderHidden={props.cardBorderHidden}
              index={index}
              showPreview={props.showPreview}
              isHidden={
                !searchedLeaflets.some(
                  (sl) => sl.token.root_entity === leaflet.root_entity,
                )
              }
            />
          </StaticLeafletDataContext>
        </ReplicacheProvider>
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
      if (titles[a.token.root_entity] === titles[b.token.root_entity]) {
        return a.added_at > b.added_at ? -1 : 1;
      } else {
        return titles[a.token.root_entity].toLocaleLowerCase() >
          titles[b.token.root_entity].toLocaleLowerCase()
          ? 1
          : -1;
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

  let allTemplates = useTemplateState((s) => s.templates);
  let filteredLeaflets = sortedLeaflets.filter(({ token: leaflet }) => {
    let published = !!leaflet.leaflets_in_publications?.find((l) => l.doc);
    let drafts = !!leaflet.leaflets_in_publications?.length && !published;
    let docs = !leaflet.leaflets_in_publications?.length;
    let templates = !!allTemplates.find((t) => t.id === leaflet.id);
    // If no filters are active, show all
    if (
      !filter.drafts &&
      !filter.published &&
      !filter.docs &&
      !filter.templates
    )
      return true;

    return (
      (filter.drafts && drafts) ||
      (filter.published && published) ||
      (filter.docs && docs) ||
      (filter.templates && templates)
    );
  });
  if (searchValue === "") return filteredLeaflets;
  let searchedLeaflets = filteredLeaflets.filter(({ token: leaflet }) => {
    return titles[leaflet.root_entity]
      ?.toLowerCase()
      .includes(searchValue.toLowerCase());
  });

  return searchedLeaflets;
}
