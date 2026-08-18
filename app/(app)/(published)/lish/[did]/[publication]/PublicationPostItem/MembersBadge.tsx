"use client";
import { LockTiny } from "components/Icons/LockTiny";
import { UnlockedTiny } from "components/Icons/UnlockedTiny";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { memberTierUnlocksGatedPost } from "src/membership";

export function MembersBadge(props: {
  publicationUri?: string;
  unlockingTierIds?: string[] | null;
}) {
  let { isMember, memberTier } = useViewerSubscription(props.publicationUri);
  let unlocked =
    isMember && memberTierUnlocksGatedPost(memberTier, props.unlockingTierIds);
  let badgeClassName =
    "membersBadge group absolute top-2.5 right-2.5 rounded-full h-5 px-0.5 flex items-center gap-1";
  if (unlocked)
    return (
      <div className={`${badgeClassName} bg-transparent text-border`}>
        <UnlockedTiny className="shrink-0" />
      </div>
    );

  return (
    <div className={`${badgeClassName} bg-accent-1 text-accent-2`}>
      <LockTiny className="shrink-0 " />
    </div>
  );
}
