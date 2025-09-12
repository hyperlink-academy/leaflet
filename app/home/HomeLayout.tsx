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
  useDashboardState,
} from "components/PageLayouts/DashboardLayout";
import { Actions } from "./Actions/Actions";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

type leaflets = Array<
  PermissionToken & {
    leaflets_in_publications?: Array<{
      doc: string;
      description: string;
      publication: string;
      leaflet: string;
      title: string;
      publications: null;
      documents: null;
    }>;
  }
>;

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
      hasBackgroundImage={hasBackgroundImage}
      currentPage="home"
      defaultTab="home"
      actions={<Actions />}
      tabs={{
        home: (
          <LeafletList
            titles={props.titles}
            initialFacts={props.initialFacts}
            cardBorderHidden={cardBorderHidden}
          />
        ),
      }}
    />
  );
};

export function LeafletList(props: {
  titles: { [root_entity: string]: string };
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  cardBorderHidden: boolean;
}) {
  let display = useDashboardState((state) => state.display);
  let sort = useDashboardState((state) => state.sort);
  let filter = useDashboardState((state) => state.filter);

  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });
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

  let sortedLeaflets: leaflets = useSortedLeaflets(props.titles);
  let filteredLeaflets: leaflets = useFilteredLeaflets(sortedLeaflets);

  return (
    <div
      className={`
        leafletList
        w-full
        ${display === "grid" ? "grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-6 sm:gap-y-5 grow" : "flex flex-col gap-2 pt-2"} `}
    >
      {filteredLeaflets.map((leaflet, index) => (
        <ReplicacheProvider
          disablePull
          initialFactsOnly={!!identity}
          key={leaflet.id}
          rootEntity={leaflet.root_entity}
          token={leaflet}
          name={leaflet.root_entity}
          initialFacts={initialFacts?.facts?.[leaflet.root_entity] || []}
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
              title={initialFacts?.titles?.[leaflet.root_entity] || "Untitled"}
              index={index}
              token={leaflet}
              draft={!!leaflet.leaflets_in_publications?.length}
              published={!!leaflet.leaflets_in_publications?.find((l) => l.doc)}
              leaflet_id={leaflet.root_entity}
              loggedIn={!!identity}
              display={display}
              cardBorderHidden={props.cardBorderHidden}
            />
          </StaticLeafletDataContext>
        </ReplicacheProvider>
      ))}
      <div className="spacer h-12 w-full bg-transparent shrink-0 " />
    </div>
  );
}

function useSortedLeaflets(titles: { [root_entity: string]: string }) {
  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });
  let { identity } = useIdentityData();
  let sort = useDashboardState((state) => state.sort);

  return identity
    ? identity.permission_token_on_homepage
        .sort((a, b) => {
          if (sort === "created") {
            return a.created_at === b.created_at
              ? a.permission_tokens.root_entity >
                b.permission_tokens.root_entity
                ? -1
                : 1
              : a.created_at > b.created_at
                ? -1
                : 1;
          } else {
            if (
              titles[a.permission_tokens.root_entity] ===
              titles[b.permission_tokens.root_entity]
            ) {
              return a.created_at > b.created_at ? -1 : 1;
            } else {
              return titles[
                a.permission_tokens.root_entity
              ].toLocaleLowerCase() >
                titles[b.permission_tokens.root_entity].toLocaleLowerCase()
                ? 1
                : -1;
            }
          }
        })
        .map((ptoh) => ptoh.permission_tokens)
    : localLeaflets
        .sort((a, b) => (a.added_at > b.added_at ? -1 : 1))
        .filter((d) => !d.hidden)
        .map((ll) => ll.token);
}

function useFilteredLeaflets(leaflets: leaflets) {
  let filter = useDashboardState((state) => state.filter);

  return leaflets.filter((leaflet) => {
    let published = !!leaflet.leaflets_in_publications?.find((l) => l.doc);
    let drafts = !!leaflet.leaflets_in_publications?.length && !published;
    let docs = !leaflet.leaflets_in_publications?.length;

    // If no filters are active, show all
    if (!filter.drafts && !filter.published && !filter.docs) return true;

    return (
      (filter.drafts && drafts) ||
      (filter.published && published) ||
      (filter.docs && docs)
    );
  });
}
