import { useIsBlockSelected } from "src/useUIState";
import { LockTiny } from "components/Icons/LockTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { BlockProps } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Menu, CheckboxMenuItem, MenuSeparator } from "components/Menu";
import { formatPrice } from "components/Memberships/TierGrid";
import { v7 } from "uuid";

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
    ${isSelected ? "block-border-selected border-none!" : ""}
  `}
    >
      <hr className="grow border-border-light" />
      <div className="flex items-center gap-2 min-w-0 font-bold">
        <LockTiny className="shrink-0" />
        <span className="w-max shrink-0">Only for</span>
        {tiers.length > 0 &&
          (permissions.write ? (
            <TierSelector
              entityID={props.entityID}
              tiers={tiers}
              tierFacts={tierFacts}
              checkedIds={checkedIds}
            />
          ) : (
            tierSummary(checkedIds, tiers)
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

// "Free" reads as a price point among the other tiers, but what checking it
// means here is everyone on the subscriber list. A renamed free tier keeps its
// own name.
function tierLabel(tier: Tier) {
  return tier.name === "Free" ? "Subscribers" : tier.name;
}

function tierSummary(checkedIds: string[], tiers: Tier[]) {
  let paid = tiers.filter((t) => !t.is_free);
  if (
    paid.length === checkedIds.length &&
    paid.every((t) => checkedIds.includes(t.id))
  )
    return "Paid Members";
  return tiers
    .filter((t) => checkedIds.includes(t.id))
    .map(tierLabel)
    .join(", ");
}

function TierSelector(props: {
  entityID: string;
  tiers: Tier[];
  tierFacts: { id: string; data: { value: string } }[];
  checkedIds: string[];
}) {
  let { rep, undoManager } = useReplicache();
  let freeTier = props.tiers.find((t) => t.is_free);
  let paidIds = props.tiers.filter((t) => !t.is_free).map((t) => t.id);

  let toggleTier = (tier: Tier) => {
    if (!rep) return;
    let checked = props.checkedIds.includes(tier.id);
    let next: string[];
    if (tier.is_free) {
      // make sure free is checked if no paid is checked
      if (checked) return;
      next = [tier.id];
    } else {
      let paidChecked = props.checkedIds.filter((id) => paidIds.includes(id));
      next = checked
        ? paidChecked.filter((id) => id !== tier.id)
        : [...paidChecked, tier.id];
      if (next.length === 0) {
        if (!freeTier) return;
        next = [freeTier.id];
      }
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
          id: v7(),
          entity: props.entityID,
          attribute: "block/members-only-tier",
          data: { type: "string", value: id },
        });
      }
    });
  };

  return (
    <Menu
      asChild
      side="top"
      align="center"
      className="p-1! max-w-full w-xs min-w-0"
      trigger={
        <button
          type="button"
          aria-label="Choose which members can read past this point"
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center gap-0.5 underline decoration-dotted hover:text-accent-contrast min-w-0 grow"
        >
          <div className="truncate">
            {" "}
            {tierSummary(props.checkedIds, props.tiers)}
          </div>
          <ArrowDownTiny className="shrink-0 scale-90" />
        </button>
      }
    >
      <div className="text-tertiary text-sm font-bold px-2 pt-1">
        Unlocked for…{" "}
      </div>
      <div className="flex flex-col gap-0.5">
        {props.tiers.map((tier, index) => (
          <div key={tier.id} className="flex flex-col gap-0.5">
            <CheckboxMenuItem
              // Selecting would close the menu, but the whole point here is
              // checking off several tiers in a row.
              onSelect={(e) => {
                e.preventDefault();
                toggleTier(tier);
              }}
              checked={props.checkedIds.includes(tier.id)}
            >
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="truncate">{tierLabel(tier)}</span>
                <span className="text-tertiary text-xs font-normal">
                  {tier.is_free
                    ? "Including free members"
                    : `${formatPrice(tier.monthly_price_cents)}/month`}
                </span>
              </div>
            </CheckboxMenuItem>
            {tier.is_free && props.tiers[index + 1] && <MenuSeparator />}
          </div>
        ))}
      </div>
    </Menu>
  );
}
