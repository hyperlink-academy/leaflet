import { useIsBlockSelected } from "src/useUIState";
import { LockTiny } from "components/Icons/LockTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { BlockProps } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import {
  Menu,
  CheckboxMenuItem,
  MenuSeparator,
  RadioMenuGroup,
  RadioMenuItem,
} from "components/Menu";
import { formatPrice } from "components/Memberships/TierGrid";
import type { GatePolicy } from "src/membership";
import { v7 } from "uuid";

export const MembersOnlyDelimiterBlock = (props: BlockProps) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { permissions } = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();

  let audienceFact = useEntity(props.entityID, "block/members-only-audience");
  let tierFacts = useEntity(props.entityID, "block/members-only-tier");

  let tiers = (pub?.publications?.publication_membership_tiers ?? [])
    .filter((t) => t.active)
    .sort((a, b) => a.monthly_price_cents - b.monthly_price_cents);

  let checkedIds = [
    ...new Set(
      tierFacts
        .map((f) => f.data.value)
        .filter((id) => tiers.some((t) => t.id === id)),
    ),
  ];
  let audience = audienceFact?.data.value;
  let policy: GatePolicy =
    audience === "subscribers"
      ? { audience }
      : audience === "paid"
        ? { audience }
        : audience === "tiers"
          ? { audience, tierIds: checkedIds }
          : { audience: "tiers", tierIds: [] };

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
        {permissions.write ? (
          <TierSelector
            entityID={props.entityID}
            tiers={tiers}
            audienceFact={audienceFact}
            tierFacts={tierFacts}
            policy={policy}
          />
        ) : (
          gateSummary(policy, tiers)
        )}
      </div>
      <hr className="grow border-border-light" />
    </div>
  );
};

type Tier = {
  id: string;
  name: string;
  monthly_price_cents: number;
};

function gateSummary(policy: GatePolicy, tiers: Tier[]) {
  if (policy.audience === "subscribers") return "Subscribers";
  if (policy.audience === "paid") return "Paid Members";
  const names = tiers
    .filter((tier) => policy.tierIds.includes(tier.id))
    .map((tier) => tier.name);
  return names.length > 0 ? names.join(", ") : "Selected Tiers";
}

function TierSelector(props: {
  entityID: string;
  tiers: Tier[];
  audienceFact: { id: string; data: { value: string } } | null | undefined;
  tierFacts: { id: string; data: { value: string } }[];
  policy: GatePolicy;
}) {
  let { rep, undoManager } = useReplicache();
  const checkedIds =
    props.policy.audience === "tiers" ? props.policy.tierIds : [];

  let setAudience = (audience: string) => {
    if (!rep) return;
    if (
      audience !== "subscribers" &&
      audience !== "paid" &&
      audience !== "tiers"
    )
      return;
    if (audience === "tiers" && props.tiers.length === 0) return;
    undoManager.withUndoGroup(async () => {
      await rep.mutate.assertFact({
        id: props.audienceFact?.id ?? v7(),
        entity: props.entityID,
        attribute: "block/members-only-audience",
        data: { type: "string", value: audience },
      });
      if (audience === "tiers") {
        const activeTierIds = new Set(props.tiers.map((tier) => tier.id));
        const selectedActiveTierIds = new Set(
          props.tierFacts
            .map((fact) => fact.data.value)
            .filter((id) => activeTierIds.has(id)),
        );
        const mutations = props.tierFacts
          .filter((fact) => !activeTierIds.has(fact.data.value))
          .map((fact) => rep.mutate.retractFact({ factID: fact.id }));
        if (selectedActiveTierIds.size === 0) {
          mutations.push(
            ...props.tiers.map((tier) =>
              rep.mutate.assertFact({
                id: v7(),
                entity: props.entityID,
                attribute: "block/members-only-tier",
                data: { type: "string", value: tier.id },
              }),
            ),
          );
        }
        await Promise.all(mutations);
      }
    });
  };

  let toggleTier = (tier: Tier) => {
    if (!rep) return;
    let checked = checkedIds.includes(tier.id);
    if (checked && checkedIds.length === 1) return;
    let next = checked
      ? checkedIds.filter((id) => id !== tier.id)
      : [...checkedIds, tier.id];
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
            {gateSummary(props.policy, props.tiers)}
          </div>
          <ArrowDownTiny className="shrink-0 scale-90" />
        </button>
      }
    >
      <div className="text-tertiary text-sm font-bold px-2 pt-1">
        Unlocked for…{" "}
      </div>
      <RadioMenuGroup value={props.policy.audience} onValueChange={setAudience}>
        <RadioMenuItem value="subscribers">Subscribers</RadioMenuItem>
        <RadioMenuItem value="paid">Paid Members</RadioMenuItem>
        {props.tiers.length > 0 && (
          <RadioMenuItem
            value="tiers"
            // Keep the menu open so the tier checkboxes it reveals can be used
            onSelect={(e) => e.preventDefault()}
          >
            Selected Paid Tiers
          </RadioMenuItem>
        )}
      </RadioMenuGroup>
      {props.policy.audience === "tiers" && props.tiers.length > 0 && (
        <MenuSeparator />
      )}
      <div className="flex flex-col gap-0.5">
        {props.policy.audience === "tiers" &&
          props.tiers.map((tier) => (
            <CheckboxMenuItem
              key={tier.id}
              // Selecting would close the menu, but the whole point here is
              // checking off several tiers in a row.
              onSelect={(e) => {
                e.preventDefault();
                toggleTier(tier);
              }}
              checked={checkedIds.includes(tier.id)}
            >
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="truncate">{tier.name}</span>
                <span className="text-tertiary text-xs font-normal">
                  {formatPrice(tier.monthly_price_cents)}/month
                </span>
              </div>
            </CheckboxMenuItem>
          ))}
      </div>
    </Menu>
  );
}
