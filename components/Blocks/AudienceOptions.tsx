"use client";
import { useReplicache } from "src/replicache";
import {
  QUESTIONS_AUDIENCES,
  QUESTIONS_AUDIENCE_LABELS,
  type QuestionsAudience,
} from "src/questionsAudience";

// The "who can submit" setting of a questions or reply block
export function AudienceOptions(props: {
  entityID: string;
  attribute: "questions/audience" | "reply/audience";
  value: QuestionsAudience;
  label: string;
  inPublication: boolean;
}) {
  let { rep } = useReplicache();
  return (
    <div className="flex flex-col gap-2">
      <div className="font-bold">{props.label}</div>
      {QUESTIONS_AUDIENCES.filter(
        (option) =>
          option !== "subscribers" ||
          props.inPublication ||
          props.value === option,
      ).map((option) => {
        let selected = props.value === option;
        let id = `${props.attribute}-${props.entityID}-${option}`;
        return (
          <label
            key={option}
            htmlFor={id}
            className={`${selected ? "accent-container border border-accent-contrast outline-offset-1 outline-2 outline-accent-contrast" : "transparent-container"} flex flex-col leading-snug px-2 py-1.5 cursor-pointer`}
          >
            <input
              type="radio"
              name={`${props.attribute}-${props.entityID}`}
              id={id}
              value={option}
              checked={selected}
              onChange={() =>
                rep?.mutate.assertFact({
                  entity: props.entityID,
                  attribute: props.attribute,
                  data: { type: "string", value: option },
                })
              }
              className="sr-only"
            />
            <span
              className={`font-bold ${selected ? "text-accent-contrast" : "text-secondary"}`}
            >
              {QUESTIONS_AUDIENCE_LABELS[option].label}
            </span>
            <span className="text-sm text-tertiary">
              {QUESTIONS_AUDIENCE_LABELS[option].description}
            </span>
          </label>
        );
      })}
    </div>
  );
}
