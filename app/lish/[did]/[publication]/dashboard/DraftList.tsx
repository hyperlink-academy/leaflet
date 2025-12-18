"use client";

import { NewDraftSecondaryButton } from "./NewDraftButton";
import React from "react";
import { usePublicationData } from "./PublicationSWRProvider";
import { LeafletList } from "app/(home-pages)/home/HomeLayout";

export function DraftList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data: pub_data } = usePublicationData();
  if (!pub_data?.publication) return null;
  let { leaflets_in_publications, ...publication } = pub_data.publication;
  return (
    <div className="flex flex-col gap-4">
      <NewDraftSecondaryButton
        fullWidth
        publication={pub_data?.publication?.uri}
      />

      <LeafletList
        searchValue={props.searchValue}
        showPreview={false}
        defaultDisplay="list"
        leaflets={leaflets_in_publications
          .filter((l) => !l.documents)
          .filter((l) => !l.archived)
          .map((l) => {
            return {
              archived: l.archived,
              added_at: "",
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
            };
          })}
        initialFacts={pub_data.leaflet_data.facts || {}}
        titles={{
          ...leaflets_in_publications.reduce(
            (acc, leaflet) => {
              if (leaflet.permission_tokens)
                acc[leaflet.permission_tokens.root_entity] =
                  leaflet.title || "Untitled";
              return acc;
            },
            {} as { [l: string]: string },
          ),
        }}
      />
      <div className="spacer h-12 w-full bg-transparent shrink-0 " />
    </div>
  );
}
