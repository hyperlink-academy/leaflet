"use client";

import { Avatar } from "components/Avatar";
import { ButtonSecondary } from "components/Buttons";
import { Popover } from "components/Popover";
import { CheckTiny } from "components/Icons/CheckTiny";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useContributorProfiles } from "src/hooks/useContributorProfiles";
import { bylineName } from "src/utils/byline";
import { Separator } from "components/Layout";
import { CheckboxMenuItem, Menu } from "components/Menu";
import { Profile } from "src/identity";

type contributors = {
  contributor_did: string;
  is_owner: boolean;
  profile: Profile | null;
}[];

export function DraftContributorSelector(props: { leaflet_id: string }) {
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();
  let { data: pub } = useLeafletPublicationData();

  // Selected contributors sync live via Replicache. The candidate list (owner +
  // confirmed publication contributors) is already part of the leaflet's
  // publication data, so we read it from there rather than re-querying.
  let selectedDids =
    useSubscribe(rep, (tx) => tx.get<string[]>("draft_contributors")) ?? [];

  let ownerDid = pub?.publications?.identity_did;
  // Owner first (synthesized — they have no publication_contributors row), then
  // confirmed contributors in invite order, deduped against the owner.
  let contributorDids =
    ownerDid === undefined
      ? []
      : [
          ownerDid,
          ...(pub?.publications?.publication_contributors ?? [])
            .filter((c) => c.confirmed && c.contributor_did !== ownerDid)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((c) => c.contributor_did),
        ];

  // Profiles are fetched asynchronously and merged in. Until they arrive,
  // bylineName falls back to the DID. The hook keys on the DID set so it
  // refetches when contributors change.
  let { data: profiles } = useContributorProfiles(contributorDids);

  let contributors = contributorDids.map((did) => ({
    contributor_did: did,
    is_owner: did === ownerDid,
    profile: profiles?.[did] ?? null,
  }));

  if (contributorDids.length <= 1) return null;
  let selected = contributors.filter((c) =>
    selectedDids.includes(c.contributor_did),
  );
  let owner = contributors.find((c) => c.is_owner) ?? null;

  let bylineEntries = selected.length > 0 ? selected : owner ? [owner] : [];

  let byline = (
    <div className="flex gap-0 items-center text-tertiary text-sm">
      {bylineEntries.length === 0 ? (
        <span className="italic">&mdash;</span>
      ) : (
        bylineEntries.map((c, i) => (
          <span key={c.contributor_did} className="flex gap-1 items-center">
            {i < bylineEntries.length - 2 && i > 0 ? (
              <span>,</span>
            ) : i === bylineEntries.length - 1 && i > 0 ? (
              <span className="pl-1"> and </span>
            ) : (
              ""
            )}
            <span>{contributorName(c)}</span>
          </span>
        ))
      )}
    </div>
  );

  if (!permissions.write) return byline;

  return (
    <div className="flex gap-2 items-center">
      {byline}
      <ContributorSelector
        contributors={contributors}
        selectedDids={selectedDids}
      />
      <Separator classname="h-4!" />
    </div>
  );
}

export const ContributorSelector = (props: {
  contributors: {
    contributor_did: string;
    is_owner: boolean;
    profile: Profile | null;
  }[];
  selectedDids: readonly string[];
}) => {
  let { rep } = useReplicache();

  let toggle = (did: string) => {
    rep?.mutate.toggleDraftContributor({
      contributor_did: did,
      selected: !props.selectedDids.includes(did),
    });
  };
  if (props.contributors.length === 0) return;
  return (
    <Menu
      align="start"
      className="p-1! w-max min-w-[192px]"
      trigger={<div className="text-accent-contrast">Add</div>}
    >
      <div className="flex flex-col gap-0.5">
        {props.contributors.map((c) => {
          let isSelected = props.selectedDids.includes(c.contributor_did);
          return (
            <CheckboxMenuItem
              key={c.contributor_did}
              onSelect={(e) => {
                e.preventDefault();
                toggle(c.contributor_did);
              }}
              checked={isSelected}
            >
              <Avatar
                src={c.profile?.avatar ?? undefined}
                displayName={contributorName(c)}
                size="small"
              />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="truncate">{contributorName(c)}</span>
                {c.is_owner && (
                  <span className="text-tertiary text-xs font-normal">
                    Owner
                  </span>
                )}
              </div>
            </CheckboxMenuItem>
          );
        })}
      </div>
    </Menu>
  );
};

function contributorName(c: contributors[number]) {
  return bylineName(
    c.profile ?? { did: c.contributor_did, handle: null, displayName: null },
  );
}
