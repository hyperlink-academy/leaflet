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
  let { identity } = useIdentityData();
  let visibleDrafts = useVisibleDrafts();
  const normalizedPubRecord = useNormalizedPublicationRecord();
  if (!pub_data?.publication) return null;
  const { leaflets_in_publications, ...publication } = pub_data.publication;

  if (!normalizedPubRecord) return null;

  if (visibleDrafts.length === 0)
    return pub_data.documents.length > 0 ? (
      <NoDrafts publication={publication.uri} />
    ) : (
      <NewPublicationWelcome
        publication={publication.uri}
        isOwner={
          !!identity?.atp_did && identity.atp_did === publication.identity_did
        }
      />
    );

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

const NoDrafts = (props: { publication: string }) => {
  return (
    <DashboardEmptyState>
      <h3 className="text-primary">No drafts right now!</h3>
      <div className="text-secondary flex flex-col gap-2">
        <p>
          Drafts will appear here. Things you&apos;ve already published are in
          the Published tab!
        </p>
      </div>
      <div className="flex flex-col items-center justify-center gap-1 pt-2">
        <NewDraftButton publication={props.publication}>
          <AddTiny /> New Draft
        </NewDraftButton>
      </div>
    </DashboardEmptyState>
  );
};

const NewPublicationWelcome = (props: {
  publication: string;
  isOwner: boolean;
}) => {
  return (
    <DashboardEmptyState>
      <img
        src="/illustrations/welcome-to-publication.webp"
        alt=""
        className="w-full max-w-md h-auto mx-auto mb-2"
      />
      <h2 className="text-primary">
        {props.isOwner
          ? "Welcome to your new Publication!"
          : "Welcome to this publication!"}
      </h2>
      <div className="text-secondary flex flex-col gap-2">
        <p className="font-bold">
          Now that you're all set up, <br />
          it&apos;s time to start writing!
        </p>
        <p>
          Drafts will appear here. Things you&apos;ve already published are in
          the Published tab!
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <NewDraftButton publication={props.publication}>
          <AddTiny /> New Draft
        </NewDraftButton>
      </div>
    </DashboardEmptyState>
  );
};
