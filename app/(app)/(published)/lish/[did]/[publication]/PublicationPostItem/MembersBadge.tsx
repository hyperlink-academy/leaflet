"use client";
import { useState } from "react";
import { LockTiny } from "components/Icons/LockTiny";
import { EarlyAccessTiny } from "components/Icons/EarlyAccessTiny";
import { UnlockedTiny } from "components/Icons/UnlockedTiny";
import { Tooltip } from "components/Tooltip";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  daysUntilLabel,
  membershipUnlocksGatedPost,
  widerReleaseReaches,
  type GatePolicy,
  type WiderRelease,
} from "src/membership";

export function MembersBadge(props: {
  publicationUri?: string;
  gatePolicy?: GatePolicy | null;
  widerRelease?: WiderRelease | null;
}) {
  let { membership } = useViewerSubscription(props.publicationUri);
  let unlocked = membershipUnlocksGatedPost(membership, props.gatePolicy);
  let badgeClassName =
    "membersBadge group absolute top-2.5 right-2.5 z-[1] rounded-full h-5 px-0.5 flex items-center gap-1";
  if (unlocked)
    return (
      <div
        className={`${badgeClassName} pointer-events-none bg-transparent text-border`}
      >
        <UnlockedTiny className="shrink-0" />
      </div>
    );

  if (widerReleaseReaches(membership, props.gatePolicy, props.widerRelease))
    return (
      <EarlyAccessBadge
        className={`${badgeClassName} pl-1.5 bg-accent-1 text-accent-2`}
        releaseAt={props.widerRelease.at}
        label={`Unlocks in ${daysUntilLabel(props.widerRelease.at)}`}
      />
    );

  return (
    <div
      className={`${badgeClassName} pointer-events-none bg-accent-1 text-accent-2`}
    >
      <LockTiny className="shrink-0 " />
    </div>
  );
}

const RELEASE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "2-digit",
  day: "2-digit",
};

// Hover shows the countdown on desktop; a tap shows it on touch screens.
function EarlyAccessBadge(props: {
  className: string;
  label: string;
  releaseAt: string;
}) {
  let [open, setOpen] = useState(false);
  let releaseDate = useLocalizedDate(props.releaseAt, RELEASE_DATE_FORMAT);
  return (
    <Tooltip
      asChild
      side="top"
      open={open}
      onOpenChange={setOpen}
      className="text-sm text-secondary font-normal"
      trigger={
        <button
          type="button"
          aria-label={props.label}
          className={props.className}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <span className="text-xs">{releaseDate}</span>
          <EarlyAccessTiny className="shrink-0" />
        </button>
      }
    >
      {props.label}
    </Tooltip>
  );
}
