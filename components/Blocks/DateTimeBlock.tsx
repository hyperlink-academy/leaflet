import { useEntity, useReplicache } from "src/replicache";
import { BlockProps, BlockLayout } from "./Block";
import { Popover } from "components/Popover";
import { useEffect, useMemo, useState } from "react";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useUIState } from "src/useUIState";
import { setHours, setMinutes } from "date-fns";
import { Separator } from "react-aria-components";
import { Checkbox } from "components/Checkbox";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { useSpring, animated } from "@react-spring/web";
import { BlockCalendarSmall } from "components/Icons/BlockCalendarSmall";
import { DatePicker } from "components/DatePicker";

export function DateTimeBlock(props: BlockProps) {
  const [isClient, setIsClient] = useState(false);
  let initialPageLoad = useHasPageLoaded();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient && !initialPageLoad)
    return (
      <div
        className={`flex flex-row gap-2 group/date w-64 z-1 border border-transparent`}
      >
        <BlockCalendarSmall className="text-tertiary" />
      </div>
    );

  return <BaseDateTimeBlock {...props} initalLoad={initialPageLoad} />;
}

export function BaseDateTimeBlock(
  props: BlockProps & { initalLoad?: boolean },
) {
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let dateFact = useEntity(props.entityID, "block/date-time");
  let selectedDate = useMemo(() => {
    if (!dateFact) return new Date();
    let d = new Date(dateFact.data.value);
    return d;
  }, [dateFact]);

  const [timeValue, setTimeValue] = useState<string>(
    () =>
      `${selectedDate.getHours().toString().padStart(2, "0")}:${selectedDate.getMinutes().toString().padStart(2, "0")}`,
  );

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let alignment = useEntity(props.entityID, "block/text-alignment")?.data.value;

  const handleTimeChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const time = e.target.value;
    setTimeValue(time);
    if (!dateFact) {
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
        originalTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attribute: "block/date-time",
    });
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!timeValue || !date) {
      if (date)
        rep?.mutate.assertFact({
          entity: props.entityID,
          data: {
            originalTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      data: {
        type: "date-time",
        value: newDate.toISOString(),

        originalTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateOnly: dateFact?.data.dateOnly,
      },
      attribute: "block/date-time",
    });
  };

  return (
    <Popover
      disabled={!permissions.write}
      className="w-64 z-10 px-2!"
      trigger={
        <BlockLayout
          isSelected={!!isSelected}
          className={`flex flex-row gap-2 group/date w-64 z-1 border-transparent!
      ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start"}
      `}
        >
          <BlockCalendarSmall className="text-tertiary" />
          <FadeIn
            active={props.initalLoad === undefined ? true : props.initalLoad}
          >
            {dateFact ? (
              <div
                className={`font-bold
              ${!permissions.write ? "" : "group-hover/date:underline"}
              `}
              >
                {selectedDate.toLocaleDateString(undefined, {
                  month: "short",
                  year:
                    new Date().getFullYear() !== selectedDate.getFullYear()
                      ? "numeric"
                      : undefined,
                  day: "numeric",
                })}{" "}
                {!dateFact.data.dateOnly ? (
                  <span>
                    |{" "}
                    {selectedDate.toLocaleTimeString([], {
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
          </FadeIn>
        </BlockLayout>
      }
    >
      <div className="flex flex-col gap-3 ">
        <DatePicker
          mode="single"
          selected={dateFact ? selectedDate : undefined}
          onSelect={handleDaySelect}
        />
        <Separator className="border-border" />
        <div className="flex gap-4 pb-1 items-center">
          <Checkbox
            checked={!!dateFact?.data.dateOnly}
            onChange={(e) => {
              rep?.mutate.assertFact({
                entity: props.entityID,
                data: {
                  type: "date-time",
                  value: dateFact?.data.value || new Date().toISOString(),
                  originalTimezone:
                    dateFact?.data.originalTimezone ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
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

let FadeIn = (props: { children: React.ReactNode; active: boolean }) => {
  let spring = useSpring({ opacity: props.active ? 1 : 0 });
  return <animated.div style={spring}>{props.children}</animated.div>;
};
