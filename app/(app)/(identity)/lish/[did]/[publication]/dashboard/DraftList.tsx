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
import { EmptyState } from "components/EmptyState";
import { NewDraftActionButton } from "./NewDraftButton";

export function DraftList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data: pub_data } = usePublicationData();
  let { identity } = useIdentityData();
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

  if (visibleDrafts.length === 0 && pub_data.documents.length === 0)
    return <NewPubOnboarding isOwner={isOwner} />;

  return (
    <div className="flex flex-col">
      <LeafletList
        emptyMessage=<Empty publication={publication.uri} />
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

const Empty = (props: { publication: string }) => {
  return (
    <EmptyState title="No drafts!">
      <div className="flex justify-center pt-1">
        <NewDraftActionButton publication={props.publication} compact />
      </div>
    </EmptyState>
  );
};
const NewPubOnboarding = (props: { isOwner: boolean }) => {
  return (
    <div className="accent-container px-4 pt-6 pb-8 text-center flex flex-col gap-2">
      <img
        src="/illustrations/leaf-boat.webp"
        alt=""
        className="w-40 max-w-full mx-auto"
      />
      <h2> Welcome to {props.isOwner ? "your new" : "this"} Publication!</h2>
      <p className="font-bold pb-1  text-lg hidden sm:block">
        Use the Sidebar to explore!
      </p>
      <p className="font-bold pb-1  text-lg sm:hidden block">
        Tap the
        <span className="sm:hidden inline-flex gap-1 items-center align-middle mx-2  border border-border rounded-md">
          <MenuSmall className="scale-80" />
        </span>
        <span className="sm:hidden inline">menu</span> to explore!
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
      {props.isOwner && (
        <p>
          Change your theme and layout with
          <span className="inline-flex gap-1 items-center align-middle text-accent-contrast font-bold pr-1 pl-0.5  text-sm rounded-md ml-1.5 -mt-0.5 border-2 border-accent-contrast bg-page">
            <PaintSmall className="scale-80" /> Customize
          </span>
        </p>
      )}
    </div>
  );
};
