import { useIsBlockSelected } from "src/useUIState";
import { LockTiny } from "components/Icons/LockTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { BlockProps } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";
import { formatPrice } from "components/Memberships/TierGrid";
import { useState } from "react";

export const MembersOnlyDelimiterBlock = (props: BlockProps) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { permissions } = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();

  let tierFacts = useEntity(props.entityID, "block/members-only-tier");

  let tiers = (pub?.publications?.publication_membership_tiers ?? [])
    .filter((t) => t.active)
    .sort((a, b) => a.monthly_price_cents - b.monthly_price_cents);

  let checkedIds = tierFacts
    .map((f) => f.data.value)
    .filter((id) => tiers.some((t) => t.id === id));
  if (checkedIds.length === 0)
    checkedIds = tiers.filter((t) => !t.is_free).map((t) => t.id);

  return (
    <div
      className={`my-2 w-full flex items-center gap-2 text-tertiary text-sm
    ${isSelected ? "block-border-selected outline-offset-[3px]!" : ""}
  `}
    >
      <hr className="grow border-border-light" />
      <div className="flex items-center gap-2 shrink-0 font-bold">
        <LockTiny />
        Members-only content below
        {tiers.length > 0 &&
          (permissions.write ? (
            <TierSelector
              entityID={props.entityID}
              tiers={tiers}
              tierFacts={tierFacts}
              checkedIds={checkedIds}
            />
          ) : (
            <span>· {tierSummary(checkedIds, tiers)}</span>
          ))}
      </div>
      <hr className="grow border-border-light" />
    </div>
  );
};

type Tier = {
  id: string;
  name: string;
  monthly_price_cents: number;
  is_free: boolean;
};

function tierSummary(checkedIds: string[], tiers: Tier[]) {
  let paid = tiers.filter((t) => !t.is_free);
  if (
    paid.length === checkedIds.length &&
    paid.every((t) => checkedIds.includes(t.id))
  )
    return "all members";
  return tiers
    .filter((t) => checkedIds.includes(t.id))
    .map((t) => t.name)
    .join(", ");
}

function TierSelector(props: {
  entityID: string;
  tiers: Tier[];
  tierFacts: { id: string; data: { value: string } }[];
  checkedIds: string[];
}) {
  let { rep, undoManager } = useReplicache();
  let [open, setOpen] = useState(false);

  let toggleTier = (tier: Tier) => {
    if (!rep) return;
    let checked = props.checkedIds.includes(tier.id);
    let next = checked
      ? props.checkedIds.filter((id) => id !== tier.id)
      : [...props.checkedIds, tier.id];
    // Unchecking the last paid tier would gate the content from everyone, so
    // the free tier takes over and it opens to any subscriber instead.
    if (
      !next.some((id) => props.tiers.some((t) => t.id === id && !t.is_free))
    ) {
      let freeTier = props.tiers.find((t) => t.is_free);
      // Nothing left to gate on: keep the last tier checked.
      if (!freeTier) return;
      if (!next.includes(freeTier.id)) next = [...next, freeTier.id];
    }
    undoManager.withUndoGroup(async () => {
      if (!rep) return;
      for (let fact of props.tierFacts) {
        if (!next.includes(fact.data.value))
          await rep.mutate.retractFact({ factID: fact.id });
      }
      for (let id of next) {
        if (props.tierFacts.some((f) => f.data.value === id)) continue;
        await rep.mutate.assertFact({
          entity: props.entityID,
          attribute: "block/members-only-tier",
          data: { type: "string", value: id },
        });
      }
    });
  };

  return (
    <Popover
      asChild
      side="top"
      align="center"
      sideOffset={6}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          aria-label="Choose which members can read past this point"
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center gap-0.5 underline decoration-dotted hover:text-accent-contrast"
        >
          · {tierSummary(props.checkedIds, props.tiers)}
          <ArrowDownTiny className="shrink-0" />
        </button>
      }
    >
      <div className="flex flex-col gap-1 py-1 min-w-[180px] text-primary">
        <div className="text-tertiary text-xs font-bold pb-1">
          Who can read past this point?
        </div>
        {props.tiers.map((tier) => (
          <div key={tier.id} onMouseDown={(e) => e.preventDefault()}>
            <Checkbox
              small
              checked={props.checkedIds.includes(tier.id)}
              onChange={() => toggleTier(tier)}
              className="px-1"
            >
              <span className="flex flex-col leading-tight">
                {tier.name}
                <span className="text-tertiary text-xs font-normal">
                  {tier.is_free
                    ? "anyone subscribed"
                    : `${formatPrice(tier.monthly_price_cents)}/month`}
                </span>
              </span>
            </Checkbox>
          </div>
        ))}
      </div>
    </Popover>
  );
}
