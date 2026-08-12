import { useIsBlockSelected } from "src/useUIState";
import { LockTiny } from "components/Icons/LockTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { CheckTiny } from "components/Icons/CheckTiny";
import { BlockProps } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Popover } from "components/Popover";
import { formatPrice } from "components/Memberships/TierGrid";
import { useState } from "react";

export const MembersOnlyDelimiterBlock = (props: BlockProps) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { permissions } = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();

  let tierFact = useEntity(props.entityID, "block/members-only-tier");
  let selectedTierId = tierFact?.data.value;

  // Only paid tiers can gate content (free subscribers never read past the
  // delimiter), ranked cheapest-first: picking a tier includes every pricier
  // one.
  let tiers = (pub?.publications?.publication_membership_tiers ?? [])
    .filter((t) => t.active && !t.is_free)
    .sort((a, b) => a.monthly_price_cents - b.monthly_price_cents);
  // No fact (or a stale one — the tier was deleted) gates as any paid
  // membership server-side, which is exactly the cheapest tier and up, so
  // display it as the cheapest tier.
  let selectedTier = tiers.find((t) => t.id === selectedTierId) ?? tiers[0];

  return (
    <div
      className={`my-2 w-full flex items-center gap-2 text-tertiary text-sm
    ${isSelected ? "block-border-selected outline-offset-[3px]!" : ""}
  `}
    >
      <hr className="grow border-border-light" />
      <div className="flex items-center gap-1 shrink-0 font-bold">
        <LockTiny />
        Members-only content below
        {permissions.write && tiers.length > 0 ? (
          <TierSelector
            entityID={props.entityID}
            tiers={tiers}
            selectedTier={selectedTier}
          />
        ) : (
          selectedTier && <span>· {tierOptionLabel(selectedTier, tiers)}</span>
        )}
      </div>
      <hr className="grow border-border-light" />
    </div>
  );
};

type PaidTier = {
  id: string;
  name: string;
  monthly_price_cents: number;
};

// The priciest tier has nothing above it, so drop the "and up".
function tierOptionLabel(tier: PaidTier, tiers: PaidTier[]) {
  return tier.id === tiers[tiers.length - 1]?.id
    ? tier.name
    : `${tier.name} and up`;
}

function TierSelector(props: {
  entityID: string;
  tiers: PaidTier[];
  selectedTier: PaidTier;
}) {
  let { rep } = useReplicache();
  let [open, setOpen] = useState(false);

  let setTier = (tier: PaidTier) => {
    if (!rep) return;
    rep.mutate.assertFact({
      entity: props.entityID,
      attribute: "block/members-only-tier",
      data: { type: "string", value: tier.id },
    });
    setOpen(false);
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
          · {tierOptionLabel(props.selectedTier, props.tiers)}
          <ArrowDownTiny className="shrink-0" />
        </button>
      }
    >
      <div className="flex flex-col gap-0.5 py-1 min-w-[180px] text-primary">
        <div className="text-tertiary text-xs font-bold pb-1">
          Who can read past this point?
        </div>
        {props.tiers.map((tier) => {
          let selected = props.selectedTier.id === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTier(tier)}
              className={`flex items-center justify-between gap-3 text-left px-1 py-0.5 rounded-md hover:bg-border-light ${selected ? "font-bold" : ""}`}
            >
              <span className="flex flex-col">
                {tierOptionLabel(tier, props.tiers)}
                <span className="text-tertiary text-xs font-normal">
                  from {formatPrice(tier.monthly_price_cents)}/month
                </span>
              </span>
              {selected && <CheckTiny className="shrink-0" />}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
