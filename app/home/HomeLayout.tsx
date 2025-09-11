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
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { Actions } from "./Actions/Actions";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";

export const HomeLayout = (props: {
  entityID: string;
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
            initialFacts={props.initialFacts}
            display="list"
            cardBorderHidden={cardBorderHidden}
          />
        ),
      }}
    />
  );
};

export function LeafletList(props: {
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  display: "list" | "grid";
  cardBorderHidden: boolean;
}) {
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
    { fallbackData: props.initialFacts },
  );
  let leaflets: Array<
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
  > = identity
    ? identity.permission_token_on_homepage
        .sort((a, b) =>
          a.created_at === b.created_at
            ? a.permission_tokens.root_entity > b.permission_tokens.root_entity
              ? -1
              : 1
            : a.created_at > b.created_at
              ? -1
              : 1,
        )
        .map((ptoh) => ptoh.permission_tokens)
    : localLeaflets
        .sort((a, b) => (a.added_at > b.added_at ? -1 : 1))
        .filter((d) => !d.hidden)
        .map((ll) => ll.token);

  return (
    <div
      className={`
        leafletList
        w-full h-full
        ${props.display === "grid" ? "grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-6 sm:gap-y-5 grow" : "flex flex-col gap-2 pt-2"} `}
    >
      {leaflets.map((leaflet, index) => (
        <ReplicacheProvider
          disablePull
          initialFactsOnly={!!identity}
          key={leaflet.id}
          rootEntity={leaflet.root_entity}
          token={leaflet}
          name={leaflet.root_entity}
          initialFacts={initialFacts?.[leaflet.root_entity] || []}
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
              index={index}
              token={leaflet}
              draft={!!leaflet.leaflets_in_publications?.length}
              published={!!leaflet.leaflets_in_publications?.find((l) => l.doc)}
              leaflet_id={leaflet.root_entity}
              loggedIn={!!identity}
              display={props.display}
              cardBorderHidden={props.cardBorderHidden}
            />
          </StaticLeafletDataContext>
        </ReplicacheProvider>
      ))}
    </div>
  );
}
