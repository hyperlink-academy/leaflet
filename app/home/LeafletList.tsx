"use client";

import { useEffect, useState } from "react";
import { getHomeDocs, HomeDoc } from "./storage";
import useSWR from "swr";
import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import { LeafletPreview } from "./LeafletPreview";
import { useIdentityData } from "components/IdentityProvider";
import type { Attribute } from "src/replicache/attributes";
import { callRPC } from "app/api/rpc/client";
import { StaticLeafletDataContext } from "components/PageSWRDataProvider";

export function LeafletList(props: {
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
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
    <div className="homeLeafletGrid grow w-full h-full">
      <div className="grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-8 gap-x-4 sm:gap-x-6 sm:gap-y-8 grow pt-3 pb-28 px-2 sm:pt-6 sm:pb-12 sm:pl-6 sm:pr-1">
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
                leaflets_in_publications:
                  leaflet.leaflets_in_publications || [],
                blocked_by_admin: null,
                custom_domain_routes: [],
              }}
            >
              <LeafletPreview
                index={index}
                token={leaflet}
                draft={!!leaflet.leaflets_in_publications?.length}
                published={
                  !!leaflet.leaflets_in_publications?.find((l) => l.doc)
                }
                leaflet_id={leaflet.root_entity}
                loggedIn={!!identity}
              />
            </StaticLeafletDataContext>
          </ReplicacheProvider>
        ))}
      </div>
    </div>
  );
}
