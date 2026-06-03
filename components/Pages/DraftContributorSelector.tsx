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
  let candidateDids =
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
  let { data: profiles } = useContributorProfiles(candidateDids);

  let candidates = candidateDids.map((did) => ({
    contributor_did: did,
    is_owner: did === ownerDid,
    profile: profiles?.[did] ?? null,
  }));

  // Only surface the contributor UI when the publication actually has more than
  // one contributor (owner + at least one confirmed). With a lone owner there's
  // nothing to pick, so the byline/selector would just be noise.
  if (candidateDids.length <= 1) return null;

  // The byline always shows the PERSON: displayName -> handle -> did fallback,
  // resolved via the profile cache. The owner is rendered as a person too
  // (never the publication name).
  let candidateName = (c: (typeof candidates)[number]) =>
    bylineName(
      c.profile ?? { did: c.contributor_did, handle: null, displayName: null },
    );

  // Selected contributors, in candidate order. When none are selected the
  // publication owner is the implicit default byline.
  let selected = candidates.filter((c) =>
    selectedDids.includes(c.contributor_did),
  );
  let owner = candidates.find((c) => c.is_owner) ?? null;

  let bylineEntries = selected.length > 0 ? selected : owner ? [owner] : [];

  let toggle = (did: string) => {
    rep?.mutate.toggleDraftContributor({
      contributor_did: did,
      selected: !selectedDids.includes(did),
    });
  };

  let byline = (
    <div className="flex gap-1 items-center text-tertiary text-sm">
      {bylineEntries.length === 0 ? (
        <span className="italic">&mdash;</span>
      ) : (
        bylineEntries.map((c, i) => (
          <span key={c.contributor_did} className="flex gap-1 items-center">
            <Avatar
              src={c.profile?.avatar ?? undefined}
              displayName={candidateName(c)}
              size="tiny"
            />
            <span>{candidateName(c)}</span>
            {i < bylineEntries.length - 1 && <span>,</span>}
          </span>
        ))
      )}
    </div>
  );

  if (!permissions.write) return byline;

  return (
    <div className="flex gap-1 items-center">
      {byline}
      <Popover
        align="start"
        className="p-1! w-max min-w-[180px]"
        trigger={
          <ButtonSecondary compact aria-label="Edit draft contributors">
            +
          </ButtonSecondary>
        }
      >
        <div className="flex flex-col gap-0.5">
          {candidates.length === 0 ? (
            <div className="text-tertiary text-sm px-2 py-1">
              No contributors
            </div>
          ) : (
            candidates.map((c) => {
              let isSelected = selectedDids.includes(c.contributor_did);
              return (
                <button
                  key={c.contributor_did}
                  onClick={() => toggle(c.contributor_did)}
                  className="flex gap-2 items-center text-left px-2 py-1 rounded-md hover:bg-border-light text-sm"
                >
                  <div className="w-4 shrink-0 flex items-center justify-center text-accent-contrast">
                    {isSelected && <CheckTiny />}
                  </div>
                  <Avatar
                    src={c.profile?.avatar ?? undefined}
                    displayName={candidateName(c)}
                    size="small"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{candidateName(c)}</span>
                    {c.is_owner && (
                      <span className="text-tertiary text-xs">Owner</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Popover>
    </div>
  );
}
