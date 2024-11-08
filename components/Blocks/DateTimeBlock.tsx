import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Block";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";

export function DateTimeBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let date = useEntity(props.entityID, "block/date-time");
  let selectedDate = useMemo(() => {
    if (!date) return new Date();
    return new Date(date.data.value);
  }, [date]);

  return (
    <Popover.Root>
      <Popover.Trigger>
        <button className="border">
          {date ? selectedDate.toLocaleDateString() : "set date"}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content>
          <DayPicker
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
            classNames={{
              selected: "bg-accent-1",
              root: "bg-bg-page border",
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
