"use client";
import { usePathname } from "next/navigation";
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

export const HomeButton = (props: { className?: string }) => {
  let current = useIsActive("/home");
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton
        icon={<HomeSmall />}
        label="Home"
        className={`${current ? "bg-bg-page! border-border-light!" : ""} w-full! ${props.className}`}
      />
    </SpeedyLink>
  );
};

export const WriterButton = () => {
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton icon={<WriterSmall />} label="Write" />
    </SpeedyLink>
  );
};

export const ReaderButton = (props: { subs: boolean }) => {
  let current = useIsActive("/reader");
  return (
    <SpeedyLink href={"/reader"} className="hover:no-underline!">
      <ActionButton
        icon={<ReaderUnreadSmall />}
        label="Read"
        className={current ? "bg-bg-page! border-border-light!" : ""}
      />
    </SpeedyLink>
  );
};

export function NotificationButton() {
  let { identity } = useIdentityData();
  let unreads = identity?.notifications[0]?.count;
  let current = useIsActive("/notifications");

  return (
    <SpeedyLink href={"/notifications"} className="hover:no-underline!">
      <ActionButton
        labelOnMobile={false}
        icon={
          unreads ? (
            <NotificationsUnreadSmall className="text-accent-contrast" />
          ) : (
            <NotificationsReadSmall />
          )
        }
        label="Notifications"
        className={`${current ? "bg-bg-page! border-border-light!" : ""} ${unreads ? "text-accent-contrast!" : ""}`}
      />
    </SpeedyLink>
  );
}
