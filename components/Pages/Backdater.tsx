"use client";
import { DayPicker } from "components/DatePicker";
import { backdatePost } from "actions/backdatePost";
import { mutate } from "swr";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useState } from "react";
import { timeAgo } from "src/utils/timeAgo";
import { Popover } from "components/Popover";

export const Backdater = (props: { publishedAt: string }) => {
  let { data: pub } = useLeafletPublicationData();
  let [isUpdating, setIsUpdating] = useState(false);
  let [localPublishedAt, setLocalPublishedAt] = useState(props.publishedAt);
  let toaster = useToaster();

  const handleDaySelect = async (date: Date | undefined) => {
    if (!date || !pub?.doc || isUpdating) return;

    // Prevent future dates
    if (date > new Date()) return;

    setIsUpdating(true);
    try {
      const result = await backdatePost({
        uri: pub.doc,
        publishedAt: date.toISOString(),
      });

      if (result.success) {
        // Update local state immediately
        setLocalPublishedAt(date.toISOString());
        // Refresh the publication data
        await mutate(`/api/pub/${pub.doc}`);
      }
    } catch (error) {
      console.error("Failed to backdate document:", error);
    } finally {
      toaster({
        content: <div className="font-bold">Updated publish date!</div>,
        type: "success",
      });
      setIsUpdating(false);
    }
  };

  const selectedDate = new Date(localPublishedAt);

  return (
    <Popover
      className="w-64 z-10 px-2!"
      trigger={
        isUpdating ? (
          <DotLoader className="h-[21px]!" />
        ) : (
          <div className="underline">{timeAgo(localPublishedAt)}</div>
        )
      }
    >
      <DayPicker
        selected={selectedDate}
        onSelect={handleDaySelect}
        disabled={(date) => date > new Date()}
        toDate={new Date()}
      />
    </Popover>
  );
};
