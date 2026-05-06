"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HomeSmall } from "components/Icons/HomeSmall";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { WriterSmall } from "components/Icons/WriterSmall";
export type navPages =
  | "home"
  | "reader"
  | "pub"
  | "notifications"
  | "looseleafs"
  | "tag"
  | "profile"
  | "discover";

function useIsActive(href: string) {
  let pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

export const WRITER_PATHS = ["/home", "/looseleafs", "/notifications"] as const;

export function useIsOnWriterPage() {
  let pathname = usePathname();
  return WRITER_PATHS.some((p) => pathname.startsWith(p));
}

export const HomeButton = (props: { className?: string }) => {
  let current = useIsActive("/home");
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton
        icon={<HomeSmall />}
        label="Home"
        active={current}
        className={`w-full! ${props.className}`}
      />
    </SpeedyLink>
  );
};

export const WriterButton = () => {
  let current = useIsOnWriterPage();
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton
        className={"w-full!"}
        icon={<WriterSmall />}
        label="Write"
        active={current}
      />
    </SpeedyLink>
  );
};

export const ReaderButton = (props: { subs: boolean }) => {
  let current = useIsActive("/reader");
  return (
    <SpeedyLink href={"/reader"} className="hover:no-underline!">
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
      className={unreads ? "text-accent-contrast! font-bold" : ""}
    />
  );
}
