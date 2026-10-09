"use client";
import { SpeedyLink } from "components/SpeedyLink";
import { useDueRefresh } from "src/hooks/useDueRefresh";
import {
  isScheduledPostPublishing,
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
  return (
    <TimedPostItem
      leaflet={scheduled.leaflet}
      title={scheduled.title}
      description={scheduled.description}
      badge={<ScheduledPostStatusBadge scheduled={scheduled} />}
      showPageBackground={props.showPageBackground}
    />
  );
}

function ScheduledPostStatusBadge(props: { scheduled: ScheduledDraft }) {
  let { scheduled } = props;
  if (scheduled.status === "publishing")
    return statusPill("light-container text-accent-contrast", "PUBLISHING…");
  return (
    <SpeedyLink
      className="hover:no-underline!"
      href={`/${scheduled.leaflet}/publish`}
    >
      {scheduled.status === "scheduled"
        ? statusPill("light-container text-accent-contrast", "SCHEDULED", true)
        : scheduled.status === "paused"
          ? statusPill("light-container text-tertiary", "PAUSED", true)
          : statusPill(
              "accent-container text-accent-2! bg-accent-1!",
              "FAILED",
            )}
    </SpeedyLink>
  );
}
