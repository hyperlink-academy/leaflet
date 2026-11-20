import { useIsBlockSelected } from "src/useUIState";
import { LockTiny } from "components/Icons/LockTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { BlockProps } from "./Block";
import { useEntity } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Popover } from "components/Popover";
import { AudienceChecklist } from "components/Memberships/AudienceChecklist";
import type { GatePolicy } from "src/membership";
import { useSetGatePolicy } from "components/Memberships/useSetGatePolicy";

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
      <hr className="grow min-w-4" />
      <div className="flex items-center gap-2 min-w-0 font-bold">
        <LockTiny className="shrink-0" />
        <span className="w-max shrink-0">Unlocked for</span>
        {permissions.write ? (
          <TierSelector
            entityID={props.entityID}
            tiers={tiers}
            policy={policy}
          />
        ) : (
          gateSummary(policy, tiers)
        )}
      </div>
      <hr className="grow min-w-4" />
    </div>
  );
};

type Tier = {
  id: string;
  name: string;
  monthly_price_cents: number;
};

// With a single tier, "paid members" and "members of that tier" are the same
// readers, so name the tier instead.
function paidLabel(tiers: Tier[]) {
  return tiers.length === 1 ? tiers[0].name : "All Paid Members";
}

function gateSummary(policy: GatePolicy, tiers: Tier[]) {
  if (policy.audience === "subscribers") return "All Subscribers";
  if (policy.audience === "paid") return paidLabel(tiers);
  const names = tiers
    .filter((tier) => policy.tierIds.includes(tier.id))
    .map((tier) => tier.name);
  return names.length > 0 ? (
    <span>
      <span className="sm:block hidden">{names.join(", ")}</span>
      <span className="block sm:hidden">Selected Tiers ({names.length})</span>
    </span>
  ) : (
    "Selected Tiers"
  );
}

function TierSelector(props: {
  entityID: string;
  tiers: Tier[];
  policy: GatePolicy;
}) {
  let { setAudience } = useSetGatePolicy(
    props.entityID,
    "block/members-only-audience",
    "block/members-only-tier",
  );
  let setPolicy = (policy: GatePolicy) =>
    setAudience(
      policy.audience,
      policy.audience === "tiers" ? policy.tierIds : [],
    );

  return (
    <Popover
      asChild
      side="top"
      align="center"
      className="max-w-full w-xs min-w-0"
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
      <div className="flex flex-col gap-2 text-primary font-normal">
        <div className="text-tertiary text-sm font-bold">Unlocked for…</div>
        <AudienceChecklist
          tiers={props.tiers}
          value={props.policy}
          onChange={setPolicy}
        />
      </div>
    </Popover>
  );
}
