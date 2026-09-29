"use client";
import { Popover } from "components/Popover";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useDueRefresh } from "src/hooks/useDueRefresh";
import {
  isScheduledPostPublishing,
  scheduledPostProblem,
  type ScheduledPost,
} from "src/scheduledPosts/types";
import { usePublicationData } from "./PublicationSWRProvider";
import type { useVisibleDrafts } from "./DraftList";
import { TimedPostItem, statusPill } from "./TimedPostItem";

type ScheduledDraft = Pick<
  ScheduledPost,
  "id" | "leaflet" | "publish_at" | "status" | "error"
> & { title: string; description: string };

// The drafts that are scheduled to publish, soonest first.
export function ScheduledPostsList(props: {
  drafts: ReturnType<typeof useVisibleDrafts>;
  showPageBackground: boolean;
}) {
  let { mutate } = usePublicationData();
  let scheduled = props.drafts
    .flatMap((d): ScheduledDraft[] => {
      let schedule = d.permission_tokens?.publication_scheduled_posts;
      if (!schedule) return [];
      return [
        {
          ...schedule,
          status: schedule.status as ScheduledPost["status"],
          leaflet: d.leaflet,
          title: d.title,
          description: d._raw.description,
        },
      ];
    })
    .sort((a, b) => a.publish_at.localeCompare(b.publish_at));
  let now = useDueRefresh(
    scheduled.map((s) => ({ status: s.status, dueAt: s.publish_at })),
    "publishing",
    mutate,
  );

  if (scheduled.length === 0) return null;
  return (
    <div className="w-full flex flex-col gap-2 pt-3 pb-4">
      <div className="text-sm font-bold text-tertiary px-1">Scheduled</div>
      {scheduled.map((s) => (
        <ScheduledPostItem
          key={s.id}
          scheduled={
            isScheduledPostPublishing(s, now)
              ? { ...s, status: "publishing" }
              : s
          }
          showPageBackground={props.showPageBackground}
        />
      ))}
    </div>
  );
}

function ScheduledPostItem(props: {
  scheduled: ScheduledDraft;
  showPageBackground: boolean;
}) {
  let { scheduled } = props;
  // Date-only: this renders on the server too, where the viewer's clock time
  // isn't known. The badge popover carries the time.
  let date = useLocalizedDate(scheduled.publish_at, {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
  return (
    <TimedPostItem
      leaflet={scheduled.leaflet}
      title={scheduled.title}
      description={scheduled.description}
      badge={<ScheduledPostStatusBadge scheduled={scheduled} />}
      when={
        <p>
          {scheduled.status === "publishing"
            ? "Publishing now"
            : scheduled.status === "scheduled"
              ? `Publishes ${date}`
              : `Was due ${date}`}
        </p>
      }
      optionsLabel={
        scheduled.status === "publishing" ? null : "Publish options"
      }
      showPageBackground={props.showPageBackground}
    />
  );
}

function ScheduledPostStatusBadge(props: { scheduled: ScheduledDraft }) {
  let { scheduled } = props;
  let publishAt = useLocalizedDate(scheduled.publish_at, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  let problem = (
    <p className="text-sm text-tertiary">
      {scheduledPostProblem(scheduled)} Open its publish options to pick a new
      time or publish it now.
    </p>
  );
  switch (scheduled.status) {
    case "scheduled":
      return (
        <Popover
          trigger={statusPill(
            "light-container text-accent-contrast",
            "SCHEDULED",
            true,
          )}
        >
          <p className="text-sm text-tertiary">Publishes {publishAt}</p>
        </Popover>
      );
    case "publishing":
      return statusPill("light-container text-accent-contrast", "PUBLISHING…");
    case "paused":
      return (
        <Popover
          trigger={statusPill("light-container text-tertiary", "PAUSED", true)}
        >
          {problem}
        </Popover>
      );
    case "failed":
      return (
        <Popover
          trigger={statusPill(
            "accent-container text-accent-2! bg-accent-1!",
            "FAILED",
          )}
        >
          {problem}
        </Popover>
      );
  }
}
