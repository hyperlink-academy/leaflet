"use client";
import { useContext } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardIdContext } from "components/PageLayouts/dashboardState";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { WriterSmall } from "components/Icons/WriterSmall";
function useIsActive(href: string) {
  let pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

const WRITER_PATHS = ["/home", "/looseleafs", "/notifications"] as const;

export function useIsOnWriterPage() {
  let pathname = usePathname();
  return WRITER_PATHS.some((p) => pathname.startsWith(p));
}

// The reader-side dashboards, keyed by the id their shell registers. Profile
// and tag count as reading even though they aren't under /reader — their own
// sidebar tabs are the reader's (Inbox/Trending/New). Everything else — the
// writer pages, publication dashboards (whose id is the publication uri) —
// is writing.
const READER_DASHBOARD_IDS = ["reader", "tag", "profile"];

export function useNavSide(): "reader" | "writer" {
  let dashboardId = useContext(DashboardIdContext);
  return dashboardId && READER_DASHBOARD_IDS.includes(dashboardId)
    ? "reader"
    : "writer";
}

export const WriterButton = () => {
  let current = useIsOnWriterPage();
  return (
    <SpeedyLink eager href={"/home"} className="hover:!no-underline">
      <ActionButton
        className={"w-full!"}
        icon={<WriterSmall />}
        label="Write"
        active={current}
      />
    </SpeedyLink>
  );
};

export const ReaderButton = () => {
  let current = useIsActive("/reader");
  return (
    <SpeedyLink eager href={"/reader"} className="hover:no-underline!">
      <ActionButton
        className="w-full!"
        icon={<ReaderUnreadSmall />}
        label="Read"
        active={current}
      />
    </SpeedyLink>
  );
};

export function NotificationButton() {
  let { identity } = useIdentityData();
  let unreads = identity?.notifications[0]?.count;

  let pathname = usePathname();
  let searchParams = useSearchParams();
  let router = useRouter();

  let isOnPage =
    pathname === "/notifications" || pathname.startsWith("/notifications/");
  let isOpen = searchParams.get("notifications") === "open";
  let active = isOnPage || isOpen;

  function handleClick() {
    if (isOnPage || isOpen) return;
    let params = new URLSearchParams(searchParams.toString());
    params.set("notifications", "open");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <ActionButton
      type="button"
      onClick={handleClick}
      labelOnMobile={false}
      icon={
        unreads ? (
          <NotificationsUnreadSmall className="text-accent-contrast" />
        ) : (
          <NotificationsReadSmall />
        )
      }
      label={
        unreads ? (
          <span className="flex items-center justify-between gap-1.5">
            Notifications
            <span className="min-w-6 h-fit px-1 py-0.5 rounded-full bg-accent-1 text-accent-2 text-sm leading-none font-bold flex items-center justify-center max-w-full truncate">
              {unreads}
            </span>
          </span>
        ) : (
          "Notifications"
        )
      }
      active={active}
      className={unreads ? "text-accent-contrast! font-bold w-full!" : "w-full"}
    />
  );
}
