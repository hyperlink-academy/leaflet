"use client";

import React from "react";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "./PublicationSWRProvider";
import { LeafletList } from "app/(app)/(identity)/(home-pages)/(writer)/home/HomeLayout";
import { useIdentityData } from "components/IdentityProvider";
import { MenuSmall } from "components/Icons/MenuSmall";
import { PaintSmall } from "components/Icons/PaintSmall";
import { ShareSmall } from "components/Icons/ShareSmall";
import { AddTiny } from "components/Icons/AddTiny";

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
        (d.permission_tokens?.leaflet_contributors ?? []).some(
          (c: { contributor_did: string }) =>
            c.contributor_did === identity?.atp_did,
        ),
      );

  return (
    <div className="flex flex-col">
      <LeafletList
        emptyMessage=<Empty />
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

const Empty = () => {
  return (
    <div className="accent-container px-4 pt-6 pb-8 text-center flex flex-col gap-2">
      <img
        src="/illustrations/leaf-boat.webp"
        alt=""
        className="w-40 max-w-full mx-auto"
      />
      <h2> Welcome to your new Publication!</h2>
      <p className="font-bold pb-1 -mt-1 text-lg">
        Use the<span className="sm:inline hidden">Sidebar</span>{" "}
        <span className="sm:hidden inline-flex gap-1 items-center align-middle mx-2 border border-border rounded-md">
          <MenuSmall className="scale-80" />
        </span>
        menu to explore
      </p>
      <p>
        Start writing with
        <span className="inline-flex gap-1 items-center align-middle bg-accent-1 border-2 border-accent-1 text-accent-2 font-bold pr-1 pl-0.5 py-0 text-sm rounded-md ml-1.5 -mt-0.5">
          <AddTiny className="scale-80" /> Draft
        </span>
      </p>

      <p>
        Share with others with
        <span className="inline-flex gap-1 items-center align-middle text-accent-contrast font-bold pr-1 pl-0.5  text-sm rounded-md ml-1.5 -mt-0.5 border-2 border-accent-contrast bg-page">
          <ShareSmall className="scale-85" /> Share
        </span>
      </p>
      <p>
        Theme with
        <span className="inline-flex gap-1 items-center align-middle text-accent-contrast font-bold pr-1 pl-0.5  text-sm rounded-md ml-1.5 -mt-0.5 border-2 border-accent-contrast bg-page">
          <PaintSmall className="scale-80" /> Customize
        </span>
      </p>
    </div>
  );
};
