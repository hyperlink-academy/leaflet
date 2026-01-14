"use client";
import { DatePicker, TimePicker } from "components/DatePicker";
import { useState } from "react";
import { timeAgo } from "src/utils/timeAgo";
import { Popover } from "components/Popover";
import { Separator } from "react-aria-components";

export const Backdater = (props: { publishedAt: string }) => {
  let [localPublishedAt, setLocalPublishedAt] = useState(
    new Date(props.publishedAt),
  );

  let [timeValue, setTimeValue] = useState(
    `${localPublishedAt.getHours().toString().padStart(2, "0")}:${localPublishedAt.getMinutes().toString().padStart(2, "0")}`,
  );

  let currentTime = `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`;

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    const [hours, minutes] = time.split(":").map((str) => parseInt(str, 10));
    const newDate = new Date(localPublishedAt);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

    let currentDate = new Date();
    if (newDate > currentDate) {
      setLocalPublishedAt(currentDate);
      setTimeValue(currentTime);
    } else setLocalPublishedAt(newDate);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    const [hours, minutes] = timeValue
      .split(":")
      .map((str) => parseInt(str, 10));
    const newDate = new Date(date);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

    let currentDate = new Date();
    if (newDate > currentDate) {
      setLocalPublishedAt(currentDate);
      setTimeValue(currentTime);
    } else setLocalPublishedAt(newDate);
  };
  console.log(localPublishedAt);

  return (
    <Popover
      className="w-64 z-10 px-2!"
      trigger={
        <div className="underline">
          {timeAgo(localPublishedAt.toISOString())}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <DatePicker
          selected={localPublishedAt}
          onSelect={handleDateChange}
          disabled={(date) => date > new Date()}
        />
        <Separator className="border-border" />
        <div className="flex gap-4 pb-1 items-center">
          <TimePicker value={timeValue} onChange={handleTimeChange} />
        </div>
      </div>
    </Popover>
  );
};
