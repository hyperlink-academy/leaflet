import { HomeSmall } from "components/Icons/HomeSmall";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import Link from "next/link";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { PublicationButtons } from "./Publications";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";

export type navPages =
  | "home"
  | "reader"
  | "pub"
  | "notifications"
  | "looseleafs"
  | "tag"
  | "profile";

export const HomeButton = (props: { current?: boolean }) => {
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton
        nav
        icon={<HomeSmall />}
        label="Home"
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </SpeedyLink>
  );
};

export const ReaderButton = (props: { current?: boolean; subs: boolean }) => {
  if (!props.subs) return;
  return (
    <SpeedyLink href={"/reader"} className="hover:no-underline!">
      <ActionButton
        nav
        icon={<ReaderUnreadSmall />}
        label="Reader"
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </SpeedyLink>
  );
};

export function NotificationButton(props: { current?: boolean }) {
  let { identity } = useIdentityData();
  let unreads = identity?.notifications[0]?.count;

  return (
    <SpeedyLink href={"/notifications"} className="hover:no-underline!">
      <ActionButton
        nav
        labelOnMobile={false}
        icon={
          unreads ? (
            <NotificationsUnreadSmall className="text-accent-contrast" />
          ) : (
            <NotificationsReadSmall />
          )
        }
        label="Notifications"
        className={`${props.current ? "bg-bg-page! border-border-light!" : ""} ${unreads ? "text-accent-contrast!" : ""}`}
      />
    </SpeedyLink>
  );
}
