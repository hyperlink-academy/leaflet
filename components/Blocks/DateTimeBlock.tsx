import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Block";
import { ChevronProps, DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { ArrowRightTiny, BlockCalendarSmall } from "components/Icons";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useUIState } from "src/useUIState";
import { setHours, setMinutes } from "date-fns";
import { Separator } from "react-aria-components";

export function DateTimeBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let dateFact = useEntity(props.entityID, "block/date-time");

  const [timeValue, setTimeValue] = useState<string>("00:00");
  let selectedDate = useMemo(() => {
    if (!dateFact) return new Date();
    return new Date(dateFact.data.value);
  }, [dateFact]);

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  // let isLocked = useEntity(props.entityID, "block/locked")?.data.value;

  const handleTimeChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const time = e.target.value;
    if (!dateFact) {
      setTimeValue(time);
      return;
    }
    const [hours, minutes] = time.split(":").map((str) => parseInt(str, 10));
    const newSelectedDate = setHours(setMinutes(selectedDate, minutes), hours);
    rep?.mutate.assertFact({
      entity: props.entityID,
      data: { type: "string", value: newSelectedDate.toISOString() },
      attribute: "block/date-time",
    });
    setTimeValue(time);
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!timeValue || !date) {
      if (date)
        rep?.mutate.assertFact({
          entity: props.entityID,
          data: { type: "string", value: date.toISOString() },
          attribute: "block/date-time",
        });
      return;
    }
    const [hours, minutes] = timeValue
      .split(":")
      .map((str) => parseInt(str, 10));
    const newDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
    );

    rep?.mutate.assertFact({
      entity: props.entityID,
      data: { type: "string", value: newDate.toISOString() },
      attribute: "block/date-time",
    });
  };

  return (
    <Popover.Root open={!permissions.write ? false : undefined}>
      <Popover.Trigger
        className={`flex flex-row gap-2 group/date w-64 z-[1]
        ${isSelected ? "block-border-selected !border-transparent" : "border border-transparent"}
        ${!permissions.write ? "pointer-events-none" : ""}
        `}
      >
        <BlockCalendarSmall className="text-tertiary" />
        {dateFact ? (
          <div className="group-hover/date:underline font-bold ">
            {selectedDate.toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
              day: "numeric",
            })}{" "}
            |{" "}
            {selectedDate.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "numeric",
            })}
          </div>
        ) : (
          <div
            className={`italic text-tertiary  text-left group-hover/date:underline`}
          >
            {permissions.write ? "add a date and time..." : "TBD..."}
          </div>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="w-64 z-10" sideOffset={8} align="start">
          <div className="bg-bg-page border p-2 rounded-md border-border flex flex-col gap-2 shadow-md">
            <DayPicker
              components={{
                Chevron: (props: ChevronProps) => <CustomChevron {...props} />,
              }}
              classNames={{
                months: "relative",
                month_caption:
                  "font-bold text-center w-full bg-border-light mb-2 py-1 rounded-md",
                button_next:
                  "absolute right-0 top-1 p-1 text-secondary hover:text-accent-contrast  flex align-center",
                button_previous:
                  "absolute left-0 top-1  p-1 text-secondary hover:text-accent-contrast rotate-180 flex align-center ",
                chevron: "text-inherit",
                month_grid: "w-full table-fixed",
                weekdays: "text-secondary text-sm",
                day: "h-[34px]  text-center",
                outside: "text-border",
                today: "font-bold",
                selected: "bg-accent-1 text-accent-2 rounded-md font-bold ",
              }}
              mode="single"
              selected={selectedDate}
              onSelect={handleDaySelect}
            />
            <Separator className="border-border" />
            <input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="dateBlockTimeInput input-border w-full mb-1 "
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const CustomChevron = (props: ChevronProps) => {
  return (
    <div {...props} className="w-full  pointer-events-none">
      <ArrowRightTiny />
    </div>
  );
};
