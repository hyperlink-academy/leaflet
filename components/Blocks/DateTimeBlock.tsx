import { useEntity, useReplicache } from "src/replicache";
import { BlockProps } from "./Block";
import { ChevronProps, DayPicker } from "react-day-picker";
import { Popover } from "components/Popover";
import { useMemo, useState } from "react";
import { ArrowRightTiny, BlockCalendarSmall } from "components/Icons";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useUIState } from "src/useUIState";
import { setHours, setMinutes } from "date-fns";
import { Separator } from "react-aria-components";
import { Checkbox } from "components/Checkbox";

export function DateTimeBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let dateFact = useEntity(props.entityID, "block/date-time");

  const [timeValue, setTimeValue] = useState<string>(
    () =>
      `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`,
  );
  let selectedDate = useMemo(() => {
    if (!dateFact) return new Date();
    return new Date(dateFact.data.value);
  }, [dateFact]);

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let isLocked = !!useEntity(props.entityID, "block/is-locked")?.data.value;

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
      data: {
        type: "date-time",
        value: newSelectedDate.toISOString(),
        dateOnly: dateFact?.data.dateOnly,
      },
      attribute: "block/date-time",
    });
    setTimeValue(time);
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!timeValue || !date) {
      if (date)
        rep?.mutate.assertFact({
          entity: props.entityID,
          data: {
            type: "date-time",
            value: date.toISOString(),
            dateOnly: dateFact?.data.dateOnly,
          },
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
      data: { type: "date-time", value: newDate.toISOString() },
      attribute: "block/date-time",
    });
  };

  return (
    <Popover
      disabled={isLocked}
      className="w-64 z-10 !px-2"
      trigger={
        <div
          className={`flex flex-row gap-2 group/date w-64 z-[1]
      ${isSelected ? "block-border-selected !border-transparent" : "border border-transparent"}
      `}
        >
          <BlockCalendarSmall className="text-tertiary" />
          {dateFact ? (
            <div
              className={`font-bold
              ${!permissions.write || isLocked ? "" : "group-hover/date:underline"}
              `}
            >
              {selectedDate.toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
                day: "numeric",
              })}{" "}
              {!dateFact.data.dateOnly ? (
                <span>
                  |{" "}
                  {selectedDate.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </span>
              ) : null}
            </div>
          ) : (
            <div
              className={`italic text-tertiary  text-left group-hover/date:underline`}
            >
              {permissions.write ? "add a date and time..." : "TBD..."}
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3 ">
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
            selected: "!bg-accent-1 text-accent-2 rounded-md font-bold",

            day: "h-[34px]  text-center rounded-md sm:hover:bg-border-light",
            outside: "text-border",
            today: "font-bold",
          }}
          mode="single"
          selected={dateFact ? selectedDate : undefined}
          onSelect={handleDaySelect}
        />
        <Separator className="border-border" />
        <div className="flex gap-4 pb-1 items-center">
          <Checkbox
            checked={!!dateFact?.data.dateOnly}
            onChange={(e) => {
              if (!dateFact) return;
              rep?.mutate.assertFact({
                entity: props.entityID,
                data: {
                  type: "date-time",
                  value: dateFact.data.value,
                  dateOnly: e.currentTarget.checked,
                },
                attribute: "block/date-time",
              });
            }}
          >
            All day
          </Checkbox>
          <input
            disabled={dateFact?.data.dateOnly}
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="dateBlockTimeInput input-with-border bg-bg-page text-primary w-full "
          />
        </div>
      </div>
    </Popover>
  );
}

const CustomChevron = (props: ChevronProps) => {
  return (
    <div {...props} className="w-full  pointer-events-none">
      <ArrowRightTiny />
    </div>
  );
};
