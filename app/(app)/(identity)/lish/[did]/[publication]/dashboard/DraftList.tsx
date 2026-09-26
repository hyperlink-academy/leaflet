"use client";

import React from "react";
import {
  usePublicationData,
  useNormalizedPublicationRecord,
} from "./PublicationSWRProvider";
import { LeafletList } from "app/(app)/(identity)/(home-pages)/(writer)/home/HomeLayout";
import { useIdentityData } from "components/IdentityProvider";
import { AddTiny } from "components/Icons/AddTiny";
import { NewDraftButton } from "./NewDraftButton";
import { DashboardEmptyState } from "./DashboardEmptyState";

export function useVisibleDrafts() {
  let { data: pub_data } = usePublicationData();
  let { identity } = useIdentityData();
  if (!pub_data?.publication) return [];
  let isOwner =
    !!identity?.atp_did &&
    identity.atp_did === pub_data.publication.identity_did;
  // Contributors only see drafts where they are listed in leaflet_contributors.
  // Owners see everything.
  let visibleDrafts = isOwner
    ? pub_data.drafts
    : pub_data.drafts.filter((d) =>
        (d.permission_tokens?.leaflet_contributors ?? []).some(
          (c: { contributor_did: string }) =>
            c.contributor_did === identity?.atp_did,
        ),
      );
  return visibleDrafts.filter((d) => d.permission_tokens);
}

export function DraftList(props: {
  searchValue: string;
  showPageBackground: boolean;
}) {
  let { data: pub_data } = usePublicationData();
  let visibleDrafts = useVisibleDrafts();
  const normalizedPubRecord = useNormalizedPublicationRecord();
  if (!pub_data?.publication) return null;
  const { leaflets_in_publications, ...publication } = pub_data.publication;

  if (!normalizedPubRecord) return null;

  if (visibleDrafts.length === 0)
    return <DraftsEmpty publication={publication.uri} />;

  return (
    <div className="flex flex-col">
      <LeafletList
        searchValue={props.searchValue}
        showPreview={false}
        defaultDisplay="list"
        leaflets={visibleDrafts.map((d) => ({
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

const DraftsEmpty = (props: { publication: string }) => {
  return (
    <DashboardEmptyState
      title="Write your first Draft!"
      illustration={
        <img
          src="/illustrations/welcome-to-publication.webp"
          alt=""
          className="w-full max-w-xs h-auto mx-auto mb-2"
        />
      }
      description={
        <>
          <p>
            Now that your publication is all set up, it&apos;s time to start
            writing!
          </p>
          <p>
            Drafts in progress will appear here. Things you&apos;ve already
            published are in the Published tab!
          </p>
        </>
      }
      cta={
        <NewDraftButton publication={props.publication}>
          <AddTiny /> New Draft
        </NewDraftButton>
      }
    />
  );
};
