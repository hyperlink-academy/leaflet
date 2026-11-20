"use client";
import { useEffect, useRef, useState } from "react";
import { Separator } from "react-aria-components";
import { startOfToday } from "date-fns";
import { useEntity, useReplicache } from "src/replicache";
import { ToggleWithLabel } from "components/Toggle";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { DatePicker, TimePicker } from "components/DatePicker";
import { RadioButton } from "components/Checkbox";
import { presetClosesAt, type ClosesAtPreset } from "src/submissionsClose";
import { useClosesAtLabel } from "./useSubmissionsClosed";

type ClosesAtAttribute = "questions/closes-at" | "reply/closes-at";

function useClosesAt(entityID: string, attribute: ClosesAtAttribute) {
  let { rep } = useReplicache();
  let fact = useEntity(entityID, attribute);
  let setClosesAt = (date: Date) =>
    rep?.mutate.assertFact({
      entity: entityID,
      attribute,
      data: { type: "string", value: date.toISOString() },
    });
  return { rep, fact, closesAt: fact?.data.value, setClosesAt };
}

export function usePopoverHeight() {
  let ref = useRef<HTMLDivElement>(null);
  let [height, setHeight] = useState<number | null>(null);
  return {
    ref,
    onSubpage: height !== null,
    open: () => setHeight(ref.current?.offsetHeight ?? 0),
    back: () => setHeight(null),
    style: height ? { height } : undefined,
  };
}

// The "close submissions" setting of a questions or reply block
export function CloseSubmissionsOption(props: {
  entityID: string;
  attribute: ClosesAtAttribute;
  submissions: "questions" | "replies";
  onPickDate: () => void;
}) {
  let { rep, fact, closesAt, setClosesAt } = useClosesAt(
    props.entityID,
    props.attribute,
  );
  return (
    <div className="flex flex-col gap-2">
      <ToggleWithLabel
        label="Close submissions"
        helpText={`Stop taking ${props.submissions} after a set time.`}
        toggle={!!closesAt}
        onToggle={() => {
          if (fact) rep?.mutate.retractFact({ factID: fact.id });
          else setClosesAt(presetClosesAt("week"));
        }}
      />
      {closesAt && (
        <ClosesAtRow closesAt={closesAt} onClick={props.onPickDate} />
      )}
    </div>
  );
}

function ClosesAtRow(props: { closesAt: string; onClick: () => void }) {
  let label = useClosesAtLabel(props.closesAt);
  return (
    <div className="flex justify-between items-center gap-4">
      <div className="text-primary font-bold shrink-0 ">Closes</div>
      <button
        type="button"
        className="bg-transparent! text-secondary px-2! py-0.5! cursor-pointer input-with-border "
        onClick={props.onClick}
      >
        {label}
      </button>
    </div>
  );
}

// The settings page for picking when a questions or reply block closes
export function ClosesAtPage(props: {
  entityID: string;
  attribute: ClosesAtAttribute;
  onBack: () => void;
}) {
  let { closesAt, setClosesAt } = useClosesAt(props.entityID, props.attribute);
  return (
    <div className="flex flex-col gap-2">
      <button
        className="text-tertiary hover:text-accent-contrast flex gap-1 items-center shrink-0 text-sm w-fit"
        type="button"
        onClick={props.onBack}
      >
        <GoToArrowLined className="rotate-180 text-xs" /> Back
      </button>
      {closesAt && (
        <ClosesAtPicker
          id={`${props.attribute}-${props.entityID}`}
          closesAt={new Date(closesAt)}
          onChange={setClosesAt}
        />
      )}
    </div>
  );
}

const PRESETS: { preset: ClosesAtPreset; label: string }[] = [
  { preset: "week", label: "1 week" },
  { preset: "twoWeeks", label: "2 weeks" },
  { preset: "month", label: "1 month" },
];

function ClosesAtPicker(props: {
  id: string;
  closesAt: Date;
  onChange: (date: Date) => void;
}) {
  // Follows the close date, so picking a preset shows its month
  let [month, setMonth] = useState(props.closesAt);
  let closesAtTime = props.closesAt.getTime();
  useEffect(() => setMonth(new Date(closesAtTime)), [closesAtTime]);
  let time = `${props.closesAt.getHours().toString().padStart(2, "0")}:${props.closesAt.getMinutes().toString().padStart(2, "0")}`;
  return (
    <div className="flex flex-col gap-3  w-full self-center">
      <div className="font-bold">Close submissions at</div>
      <div className="flex gap-2 w-full pt-1">
        {PRESETS.map(({ preset, label }) => (
          <RadioButton
            compact
            className="text-sm! grow "
            key={preset}
            id={`${props.id}-${preset}`}
            name={`${props.id}-preset`}
            value={preset}
            checked={
              presetClosesAt(preset).getTime() === props.closesAt.getTime()
            }
            onChange={() => props.onChange(presetClosesAt(preset))}
          >
            {label}
          </RadioButton>
        ))}
      </div>
      <Separator className="border-border" />
      <DatePicker
        fullWidth
        selected={props.closesAt}
        month={month}
        onMonthChange={setMonth}
        onSelect={(date: Date | undefined) => {
          if (!date) return;
          let next = new Date(props.closesAt);
          next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
          props.onChange(next);
        }}
        disabled={(date: Date) => date < startOfToday()}
      />
      <Separator className="border-border" />
      <div className="flex gap-4 pb-1 items-center">
        <TimePicker
          value={time}
          onChange={(value) => {
            let [hours, minutes] = value.split(":").map((n) => parseInt(n));
            if (isNaN(hours) || isNaN(minutes)) return;
            let next = new Date(props.closesAt);
            next.setHours(hours, minutes, 0, 0);
            props.onChange(next);
          }}
        />
      </div>
    </div>
  );
}
