"use client";

import { NewDraftSecondaryButton } from "./NewDraftButton";
import React from "react";
import { usePublicationData } from "./PublicationSWRProvider";
import { LeafletList } from "app/home/HomeLayout";

export function DraftList(props: { searchValue: string }) {
  let { data: pub_data } = usePublicationData();
  if (!pub_data?.publication) return null;
  let { leaflets_in_publications, ...publication } = pub_data.publication;
  return (
    <div className="flex flex-col gap-4 pb-4">
      <NewDraftSecondaryButton
        fullWidth
        publication={pub_data?.publication?.uri}
      />
      <LeafletList
        searchValue={props.searchValue}
        defaultDisplay="list"
        cardBorderHidden={true}
        leaflets={leaflets_in_publications.map((l) => {
          return {
            token: {
              ...l.permission_tokens!,
              leaflets_in_publications: [
                {
                  ...l,
                  publications: {
                    ...publication,
                  },
                },
              ],
            },
            added_at: "",
          };
        })}
        initialFacts={pub_data.leaflet_data.facts || {}}
        titles={{
          ...leaflets_in_publications.reduce(
            (acc, leaflet) => {
              if (leaflet.title && leaflet.permission_tokens)
                acc[leaflet.permission_tokens.root_entity] = leaflet.title;
              return acc;
            },
            {} as { [l: string]: string },
          ),
        }}
      />
    </div>
  );
}
