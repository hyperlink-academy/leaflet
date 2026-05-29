"use client";

import useSWR from "swr";
import { Avatar } from "components/Avatar";
import { ButtonSecondary } from "components/Buttons";
import { Popover } from "components/Popover";
import { CheckTiny } from "components/Icons/CheckTiny";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { listDraftContributorCandidates } from "actions/publications/draftContributors";
import { bylineName } from "src/utils/byline";

export function DraftContributorSelector(props: { leaflet_id: string }) {
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();

  // Selected contributors sync live via Replicache; the candidate list (which
  // needs Bluesky profile enrichment) is a read-only fetch.
  let selectedDids =
    useSubscribe(rep, (tx) => tx.get<string[]>("draft_contributors")) ?? [];
  let { data: candidates = [] } = useSWR(
    `draft-contributor-candidates-${props.leaflet_id}`,
    async () => {
      let res = await listDraftContributorCandidates(props.leaflet_id);
      return res.ok ? res.value : [];
    },
  );

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
