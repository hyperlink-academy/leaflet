import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Block";
import { ChevronProps, DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { ArrowRightTiny, BlockCalendarSmall } from "components/Icons";
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
          className={`flex flex-row gap-2 group/date w-64
          ${isSelected ? "block-border-selected !border-transparent" : "border border-transparent"}
          `}
        >
          <BlockCalendarSmall />
          {date ? (
            <div className="group-hover/date:underline font-bold ">
              {selectedDate.toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
                day: "numeric",
              })}
            </div>
          ) : (
            <div className="italic text-tertiary  text-left group-hover/date:underline">
              {permissions.write ? "add a date..." : "TBD..."}
            </div>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="w-64" sideOffset={8} align="start">
          <DayPicker
            components={{
              Chevron: (props: ChevronProps) => <CustomChevron {...props} />,
            }}
            classNames={{
              months: "relative",
              month_caption:
                "font-bold text-center w-full bg-border-light mb-1 py-1 rounded-md",
              button_next:
                "absolute top-1 right-0 p-1 text-secondary hover:text-accent-contrast  flex align-center",
              button_previous:
                "absolute top-1 left-0 p-1 text-secondary hover:text-accent-contrast rotate-180 flex align-center ",
              chevron: "text-inherit",
              month_grid: "w-full table-fixed",
              weekdays: "text-secondary",
              day: "h-[34px]  text-center",
              outside: "text-border",
              today: "font-bold",
              selected: "bg-accent-1 text-accent-2 rounded-md font-bold ",
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

const CustomChevron = (props: ChevronProps) => {
  return (
    <button {...props}>
      <ArrowRightTiny />
    </button>
  );
};
