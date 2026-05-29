"use client";

import useSWR, { useSWRConfig } from "swr";
import { Avatar } from "components/Avatar";
import { ButtonSecondary } from "components/Buttons";
import { Popover } from "components/Popover";
import { CheckTiny } from "components/Icons/CheckTiny";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  listDraftContributors,
  addDraftContributor,
  removeDraftContributor,
  type DraftContributorCandidate,
  type DraftContributorsData,
} from "actions/publications/draftContributors";
import { bylineName } from "src/utils/byline";

// The byline always shows the PERSON: displayName -> handle -> did fallback,
// resolved via the profile cache like every other candidate. The owner is
// rendered as a person too (never the publication name).
function candidateName(c: DraftContributorCandidate) {
  return bylineName({
    did: c.contributor_did,
    handle: c.handle,
    displayName: c.display_name,
  });
}

export function DraftContributorSelector(props: { leaflet_id: string }) {
  let { permissions } = useEntitySetContext();
  let { cache } = useSWRConfig();
  let swrKey = `draft-contributors-${props.leaflet_id}`;
  let { data, mutate } = useSWR(swrKey, async () => {
    let res = await listDraftContributors(props.leaflet_id);
    if (!res.ok) return null;
    return res.value;
  });

  let candidates = data?.candidates ?? [];
  let selectedDids = data?.selected_dids ?? [];

  // Selected contributors, in candidate order. When none are selected the
  // publication owner is the implicit default byline.
  let selected = candidates.filter((c) => selectedDids.includes(c.contributor_did));
  let owner = candidates.find((c) => c.is_owner) ?? null;

  let bylineEntries: DraftContributorCandidate[] =
    selected.length > 0 ? selected : owner ? [owner] : [];

  let toggle = async (did: string) => {
    // Derive the intended next state from the CURRENT cache value (not the
    // render closure) so rapid toggles compose instead of clobbering each
    // other. Both the optimistic update and the chosen server action key off
    // the live cache, and SWR rolls back on error rather than restoring a
    // captured snapshot.
    let current =
      (cache.get(swrKey)?.data as DraftContributorsData | undefined)
        ?.selected_dids ?? [];
    let willSelect = !current.includes(did);
    await mutate(
      async () => {
        let res = willSelect
          ? await addDraftContributor(props.leaflet_id, did)
          : await removeDraftContributor(props.leaflet_id, did);
        if (!res.ok) throw new Error(res.error);
        // Revalidate (below) reconciles the authoritative server list.
        return undefined;
      },
      {
        optimisticData: (cur) => {
          if (!cur) return cur as any;
          let sel = cur.selected_dids;
          let next = willSelect
            ? sel.includes(did)
              ? sel
              : [...sel, did]
            : sel.filter((d) => d !== did);
          return { ...cur, selected_dids: next };
        },
        rollbackOnError: true,
        populateCache: false,
        revalidate: true,
      },
    );
  };

  let byline = (
    <div className="flex gap-1 items-center text-tertiary text-sm">
      {bylineEntries.length === 0 ? (
        <span className="italic">&mdash;</span>
      ) : (
        bylineEntries.map((c, i) => (
          <span key={c.contributor_did} className="flex gap-1 items-center">
            <Avatar
              src={c.avatar ?? undefined}
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
                    src={c.avatar ?? undefined}
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
