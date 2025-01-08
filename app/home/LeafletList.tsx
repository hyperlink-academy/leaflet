"use client";

import { useEffect, useState } from "react";
import { getHomeDocs, HomeDoc } from "./storage";
import useSWR from "swr";
import { Fact, ReplicacheProvider } from "src/replicache";
import { LeafletPreview } from "./LeafletPreview";
import { useIdentityData } from "components/IdentityProvider";
import { Attributes } from "src/replicache/attributes";
import { getIdentityData } from "actions/getIdentityData";
import { callRPC } from "app/api/rpc/client";

export function LeafletList(props: {
  initialFacts: {
    [root_entity: string]: Fact<keyof typeof Attributes>[];
  };
}) {
  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });
  let { identity } = useIdentityData();
  let { data: initialFacts, mutate } = useSWR(
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
  useEffect(() => {
    mutate();
  }, [localLeaflets.length, mutate]);
  let leaflets = identity
    ? identity.permission_token_on_homepage
        .sort((a, b) =>
          a.created_at === b.created_at
            ? a.permission_tokens.id > b.permission_tokens.id
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
    <div className="homeLeafletGrid grow w-full h-full overflow-y-scroll no-scrollbar  ">
      <div className="grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-6 gap-x-4 sm:gap-6 grow pt-3 pb-28 sm:pt-6 sm:pb-12 sm:pl-6 sm:pr-1">
        {leaflets.map((leaflet, index) => (
          <ReplicacheProvider
            initialFactsOnly={!!identity}
            key={leaflet.id}
            rootEntity={leaflet.root_entity}
            token={leaflet}
            name={leaflet.root_entity}
            initialFacts={initialFacts?.[leaflet.root_entity] || []}
          >
            <LeafletPreview
              index={index}
              token={leaflet}
              leaflet_id={leaflet.root_entity}
              loggedIn={!!identity}
            />
          </ReplicacheProvider>
        ))}
      </div>
    </div>
  );
}
