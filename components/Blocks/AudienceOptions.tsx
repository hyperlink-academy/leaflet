"use client";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { Radio } from "components/Checkbox";
import { AudienceChecklist } from "components/Memberships/AudienceChecklist";
import { useSetGatePolicy } from "components/Memberships/useSetGatePolicy";
import type { GatePolicy } from "src/membership";
import {
  QUESTIONS_AUDIENCE_LABELS,
  isMembershipAudience,
  type QuestionsAudience,
} from "src/questionsAudience";

const OPTIONS = ["anyone", "subscribers", "follows", "followers"] as const;

// The "who can submit" setting of a questions or reply block
export function AudienceOptions(props: {
  entityID: string;
  block: "questions" | "reply";
  value: QuestionsAudience;
  label: string;
  inPublication: boolean;
}) {
  let { data: pub } = useLeafletPublicationData();
  let attribute = `${props.block}/audience` as const;
  let { tierFacts, setAudience } = useSetGatePolicy(
    props.entityID,
    attribute,
    `${props.block}/audience-tier`,
  );

  let tiers = (pub?.publications?.publication_membership_tiers ?? [])
    .filter((t) => t.active && t.monthly_price_cents > 0)
    .sort((a, b) => a.monthly_price_cents - b.monthly_price_cents);
  let selected: (typeof OPTIONS)[number] = isMembershipAudience(props.value)
    ? "subscribers"
    : (props.value as (typeof OPTIONS)[number]);
  let checklistValue: GatePolicy =
    props.value === "tiers"
      ? { audience: "tiers", tierIds: tierFacts.map((f) => f.data.value) }
      : props.value === "paid"
        ? { audience: "paid" }
        : { audience: "subscribers" };

  let options = OPTIONS.filter(
    (option) =>
      option !== "subscribers" || props.inPublication || selected === option,
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="font-bold">{props.label}</div>
      {options.map((option) => (
        <div key={option} className="flex flex-col gap-1">
          <Radio
            id={`${attribute}-${props.entityID}-${option}`}
            name={`${attribute}-${props.entityID}`}
            value={option}
            checked={selected === option}
            onChange={() => setAudience(option)}
          >
            {QUESTIONS_AUDIENCE_LABELS[option]}
          </Radio>
          {option === "subscribers" &&
            selected === "subscribers" &&
            (tiers.length > 0 || props.value !== "subscribers") && (
              <div className=" ml-5 pb-1">
                <AudienceChecklist
                  tiers={tiers}
                  value={checklistValue}
                  onChange={(value) => {
                    setAudience(
                      value.audience,
                      value.audience === "tiers" ? value.tierIds : [],
                    );
                  }}
                />
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
