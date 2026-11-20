"use client";
import { Checkbox } from "components/Checkbox";
import { formatPrice } from "components/Memberships/TierGrid";
import type { GatePolicy } from "src/membership";

export type AudienceChecklistTier = {
  id: string;
  name: string;
  monthly_price_cents: number;
};

export function AudienceChecklist(props: {
  tiers: AudienceChecklistTier[];
  value: GatePolicy;
  onChange: (value: GatePolicy) => void;
}) {
  let { tiers, value } = props;
  let allTierIds = tiers.map((t) => t.id);
  let selectedTiers =
    value.audience === "tiers"
      ? value.tierIds.filter((id) => allTierIds.includes(id))
      : allTierIds;
  let subscribers = value.audience === "subscribers";
  let paid =
    subscribers ||
    value.audience === "paid" ||
    (allTierIds.length > 0 && selectedTiers.length === allTierIds.length);

  let selectTiers = (ids: string[]) => {
    if (ids.length === 0) return;
    props.onChange(
      ids.length === allTierIds.length
        ? { audience: "paid" }
        : { audience: "tiers", tierIds: ids },
    );
  };

  let singleTier = tiers.length === 1 ? tiers[0] : null;
  return (
    <div className="flex flex-col gap-1">
      <Checkbox
        small
        checked={subscribers}
        onChange={() => {
          // Without tiers, paid members would leave no one
          if (subscribers && tiers.length === 0) return;
          props.onChange({ audience: subscribers ? "paid" : "subscribers" });
        }}
      >
        All free and paid subscribers
      </Checkbox>
      {(tiers.length > 0 || value.audience === "paid") && (
        <Checkbox
          small
          checked={paid}
          onChange={() => {
            if (!paid || subscribers) props.onChange({ audience: "paid" });
          }}
        >
          {singleTier ? <TierLabel tier={singleTier} /> : "Paid members"}
        </Checkbox>
      )}
      {!singleTier && tiers.length > 0 && (
        <>
          <hr className="border-border-light my-1 border-dashed" />
          {tiers.map((tier) => {
            let checked = selectedTiers.includes(tier.id);
            return (
              <Checkbox
                small
                key={tier.id}
                checked={checked}
                onChange={() =>
                  selectTiers(
                    checked
                      ? selectedTiers.filter((id) => id !== tier.id)
                      : [...selectedTiers, tier.id],
                  )
                }
              >
                <TierLabel tier={tier} />
              </Checkbox>
            );
          })}
        </>
      )}
    </div>
  );
}

function TierLabel(props: { tier: AudienceChecklistTier }) {
  return (
    <span className="flex justify-between gap-2 w-full min-w-0">
      <span className="truncate">{props.tier.name}</span>
      <span className="text-tertiary font-normal shrink-0">
        {formatPrice(props.tier.monthly_price_cents)}/mo
      </span>
    </span>
  );
}
