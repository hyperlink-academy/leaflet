"use client";

import React from "react";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "./PublicationSWRProvider";
import { LeafletList } from "app/(app)/(home-pages)/(writer)/home/HomeLayout";
import { useIdentityData } from "components/IdentityProvider";

export function DraftList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data: pub_data } = usePublicationData();
  let { identity } = useIdentityData();
  // Normalize the publication record - skip rendering if unrecognized format
  const normalizedPubRecord = useNormalizedPublicationRecord();
  if (!pub_data?.publication) return null;
  const { drafts } = pub_data;
  const { leaflets_in_publications, ...publication } = pub_data.publication;

  if (!normalizedPubRecord) return null;

  // Contributors only see drafts where they are listed in leaflet_contributors.
  // Owners see everything.
  let isOwner =
    !!identity?.atp_did && identity.atp_did === publication.identity_did;
  let visibleDrafts = isOwner
    ? drafts
    : drafts.filter((d) =>
        (
          d.permission_tokens?.leaflet_contributors ?? []
        ).some(
          (c: { contributor_did: string }) =>
            c.contributor_did === identity?.atp_did,
        ),
      );

  return (
    <div className="flex flex-col">
      <LeafletList
        searchValue={props.searchValue}
        showPreview={false}
        defaultDisplay="list"
        leaflets={visibleDrafts
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
        titles={{
          ...visibleDrafts.reduce(
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
