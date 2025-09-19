"use client";

import { getHomeDocs, HomeDoc } from "./storage";
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
import { HomeSmall } from "components/Icons/HomeSmall";
import {
  DashboardLayout,
  DashboardState,
  useDashboardState,
} from "components/PageLayouts/DashboardLayout";
import { Actions } from "./Actions/Actions";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { Json } from "supabase/database.types";
import { useTemplateState } from "./Actions/CreateNewButton";
import {
  get_leaflet_data,
  GetLeafletDataReturnType,
} from "app/api/rpc/[command]/get_leaflet_data";

type Leaflet = {
  added_at: string;
  token: PermissionToken & {
    leaflets_in_publications?: Exclude<
      GetLeafletDataReturnType["result"]["data"],
      null
    >["leaflets_in_publications"];
  };
};

export const HomeLayout = (props: {
  entityID: string;
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
  return (
    <DashboardLayout
      defaultDisplay="grid"
      id="home"
      hasBackgroundImage={hasBackgroundImage}
      currentPage="home"
      defaultTab="home"
      actions={<Actions />}
      tabs={{
        home: (
          <HomeLeafletList
            titles={props.titles}
            initialFacts={props.initialFacts}
            cardBorderHidden={cardBorderHidden}
          />
        ),
      }}
    />
  );
};

export function HomeLeafletList(props: {
  titles: { [root_entity: string]: string };
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  cardBorderHidden: boolean;
}) {
  let { display } = useDashboardState();
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
        return result;
      }
    },
    { fallbackData: { facts: props.initialFacts, titles: props.titles } },
  );

  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });
  let leaflets = identity
    ? identity.permission_token_on_homepage.map((ptoh) => ({
        added_at: ptoh.created_at,
        token: ptoh.permission_tokens as PermissionToken,
      }))
    : localLeaflets
        .sort((a, b) => (a.added_at > b.added_at ? -1 : 1))
        .filter((d) => !d.hidden)
        .map((ll) => ll);

  let sortedLeaflets: Leaflet[] = useSortedLeaflets(props.titles, leaflets);
  let filteredLeaflets: Leaflet[] = useFilteredLeaflets(sortedLeaflets);
  console.log(
    filteredLeaflets.filter((l) => l.token.leaflets_in_publications?.[0]),
  );

  return (
    <LeafletList
      defaultDisplay="grid"
      leaflets={leaflets}
      titles={initialFacts?.titles || {}}
      cardBorderHidden={props.cardBorderHidden}
      initialFacts={initialFacts?.facts || {}}
    />
  );
}

export function LeafletList(props: {
  leaflets: Leaflet[];
  titles: { [root_entity: string]: string };
  defaultDisplay: Exclude<DashboardState["display"], undefined>;
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  cardBorderHidden: boolean;
}) {
  let { identity } = useIdentityData();
  let { display } = useDashboardState();
  display = display || props.defaultDisplay;
  let sortedLeaflets: Leaflet[] = useSortedLeaflets(
    props.titles,
    props.leaflets,
  );
  let filteredLeaflets: Leaflet[] = useFilteredLeaflets(sortedLeaflets);
  console.log(
    filteredLeaflets.filter((l) => l.token.leaflets_in_publications?.[0]),
  );

  return (
    <div
      className={`
        leafletList
        w-full
        ${display === "grid" ? "grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-6 sm:gap-y-5 grow" : "flex flex-col gap-2 pt-2"} `}
    >
      {filteredLeaflets.map(({ token: leaflet, added_at }, index) => (
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
              index={index}
              token={leaflet}
              draft={!!leaflet.leaflets_in_publications?.length}
              published={!!leaflet.leaflets_in_publications?.find((l) => l.doc)}
              publishedAt={
                leaflet.leaflets_in_publications?.find((l) => l.doc)?.documents
                  ?.indexed_at
              }
              leaflet_id={leaflet.root_entity}
              loggedIn={!!identity}
              display={display}
              added_at={added_at}
              cardBorderHidden={props.cardBorderHidden}
            />
          </StaticLeafletDataContext>
        </ReplicacheProvider>
      ))}
      <div className="spacer h-12 w-full bg-transparent shrink-0 " />
    </div>
  );
}

function useSortedLeaflets(
  titles: { [root_entity: string]: string },
  leaflets: Leaflet[],
) {
  let { sort } = useDashboardState();
  return leaflets.sort((a, b) => {
    if (sort === "created") {
      return a.added_at === b.added_at
        ? a.token.root_entity > b.token.root_entity
          ? -1
          : 1
        : a.added_at > b.added_at
          ? -1
          : 1;
    } else {
      if (titles[a.token.root_entity] === titles[b.token.root_entity]) {
        return a.added_at > b.added_at ? -1 : 1;
      } else {
        return titles[a.token.root_entity].toLocaleLowerCase() >
          titles[b.token.root_entity].toLocaleLowerCase()
          ? 1
          : -1;
      }
    }
  });
}

function useFilteredLeaflets(leaflets: Leaflet[]) {
  let { filter } = useDashboardState();
  let allTemplates = useTemplateState((s) => s.templates);

  return leaflets.filter(({ token: leaflet }) => {
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
}
