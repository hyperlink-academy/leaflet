import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Block";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { BlockCalendarSmall } from "components/Icons";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useUIState } from "src/useUIState";

export function DateTimeBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let date = useEntity(props.entityID, "block/date-time");
  let selectedDate = useMemo(() => {
    if (!date) return new Date();
    return new Date(date.data.value);
  }, [date]);

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  return (
    <Popover.Root open={!permissions.write ? false : undefined}>
      <Popover.Trigger>
        <button
          className={`flex flex-row gap-1 italic
          ${isSelected ? "block-border" : "border border-transparent"}
          `}
        >
          <BlockCalendarSmall />{" "}
          {date ? (
            selectedDate.toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
              day: "numeric",
            })
          ) : (
            <div className="italic rounded-md border border-border px-1 text-border w-48 text-left">
              {permissions.write ? "add a date..." : "TBD..."}
            </div>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-48"
          sideOffset={4}
          align="start"
          alignOffset={28}
        >
          <DayPicker
            classNames={{
              selected: "bg-accent-1",
              root: "bg-bg-page border p-2 rounded-md border-border",
            }}
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date)
                rep?.mutate.assertFact({
                  entity: props.entityID,
                  data: { type: "string", value: date.toISOString() },
                  attribute: "block/date-time",
                });
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
