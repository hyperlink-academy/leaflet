"use client";

import { NewDraftSecondaryButton } from "./NewDraftButton";
import React from "react";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "./PublicationSWRProvider";
import { LeafletList } from "app/(home-pages)/home/HomeLayout";

export function DraftList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data: pub_data } = usePublicationData();
  // Normalize the publication record - skip rendering if unrecognized format
  const normalizedPubRecord = useNormalizedPublicationRecord();
  if (!pub_data?.publication) return null;
  const { drafts, leaflet_data } = pub_data;
  const { leaflets_in_publications, ...publication } = pub_data.publication;

  if (!normalizedPubRecord) return null;

  return (
    <div className="flex flex-col">
      <LeafletList
        searchValue={props.searchValue}
        showPreview={false}
        defaultDisplay="list"
        leaflets={drafts
          .filter((d) => d.permission_tokens)
          .map((d) => ({
            archived: (d._raw as { archived?: boolean }).archived,
            added_at: "",
            token: {
              ...d.permission_tokens!,
              leaflets_in_publications: [
                {
                  ...d._raw,
                  publications: publication,
                },
              ],
            },
          }))}
        initialFacts={leaflet_data.facts || {}}
        titles={{
          ...drafts.reduce(
            (acc, draft) => {
              if (draft.permission_tokens)
                acc[draft.permission_tokens.root_entity] =
                  draft.title || "Untitled";
              return acc;
            },
            {} as { [l: string]: string },
          ),
        }}
      />
      <div className="spacer h-16 w-full bg-transparent shrink-0 " />
    </div>
  );
}
