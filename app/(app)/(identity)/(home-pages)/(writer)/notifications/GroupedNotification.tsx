"use client";
import { useState } from "react";
import { Avatar } from "components/Avatar";
import { ContentLayout, Notification } from "./Notification";
import { RecommendFilledTiny } from "components/Icons/RecommendTiny";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { timeAgo } from "src/utils/timeAgo";
import { getDocumentURL } from "src/utils/getPublicationURL";
import type {
  GroupableNotification,
  NotificationGroup,
} from "src/notificationGrouping";

const MAX_FACEPILE_AVATARS = 3;

function memberProfile(n: GroupableNotification) {
  return n.type === "subscribe"
    ? n.subscriptionData.profile
    : n.recommendData.profile;
}

export const GroupedNotification = ({
  group,
}: {
  group: NotificationGroup;
}) => {
  let [expanded, setExpanded] = useState(false);
  let head = group.notifications[0];
  let count = group.notifications.length;

  let href: string;
  let actionText: React.ReactNode;
  let icon: React.ReactNode;
  let postCard: React.ReactNode = null;
  if (head.type === "subscribe") {
    let pubRecord = head.normalizedPublication;
    href = pubRecord ? pubRecord.url : "#";
    actionText = (
      <>
        {count} people subscribed to {pubRecord?.name}!
      </>
    );
    icon = <Facepile members={group.notifications} />;
  } else {
    let docRecord = head.normalizedDocument;
    let pubRecord = head.normalizedPublication;
    if (!docRecord) return null;
    href = getDocumentURL(docRecord, head.document.uri, pubRecord);
    actionText = <>{count} people recommended your post</>;
    icon = <RecommendFilledTiny />;
    postCard = (
      <ContentLayout postTitle={docRecord.title} pubRecord={pubRecord}>
        {null}
      </ContentLayout>
    );
  }

  return (
    <Notification
      timestamp={head.created_at}
      href={href}
      icon={icon}
      actionText={actionText}
      content={
        <div className="flex flex-col gap-2 w-full min-w-0">
          {postCard}
          {/* relative so the toggle stacks above the row's absolute overlay link */}
          <button
            type="button"
            className="relative flex flex-row gap-1 items-center w-fit text-sm text-tertiary hover:text-accent-contrast"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ArrowDownTiny /> : <ArrowRightTiny />}
            {expanded ? "Hide" : "Show all"}
          </button>
          {expanded && (
            <div className="flex flex-col gap-1">
              {group.notifications.map((n) => (
                <MemberRow key={n.id} notification={n} />
              ))}
            </div>
          )}
        </div>
      }
    />
  );
};

const Facepile = ({ members }: { members: GroupableNotification[] }) => {
  return (
    <div className="flex flex-row -space-x-1">
      {members.slice(0, MAX_FACEPILE_AVATARS).map((n) => {
        let profile = memberProfile(n);
        return (
          <Avatar
            key={n.id}
            src={profile?.avatar ?? undefined}
            displayName={profile?.displayName || profile?.handle || "Someone"}
            size="tiny"
          />
        );
      })}
    </div>
  );
};

const MemberRow = ({ notification }: { notification: GroupableNotification }) => {
  let profile = memberProfile(notification);
  let displayName = profile?.displayName || profile?.handle || "Someone";
  return (
    <div className="flex flex-row gap-2 items-center text-sm w-full min-w-0">
      <Avatar
        src={profile?.avatar ?? undefined}
        displayName={displayName}
        size="small"
      />
      <div className="text-secondary font-bold truncate grow min-w-0">
        {displayName}
      </div>
      <div className="text-tertiary shrink-0 text-sm">
        {timeAgo(notification.created_at)}
      </div>
    </div>
  );
};
