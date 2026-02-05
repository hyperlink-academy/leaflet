import { HomeSmall } from "components/Icons/HomeSmall";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { PublicationButtons } from "./Publications";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { Popover } from "components/Popover";
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

export const HomeButton = (props: {
  current?: boolean;
  className?: string;
}) => {
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton
        nav
        icon={<HomeSmall />}
        label="Write"
        className={`${props.current ? "bg-bg-page! border-border-light!" : ""} w-full! ${props.className}`}
      />
    </SpeedyLink>
  );
};

export const WriterButton = (props: {
  currentPage: navPages;
  currentPubUri?: string;
  compactOnMobile?: boolean;
}) => {
  let current =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub";

  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton
        nav
        labelOnMobile={!props.compactOnMobile}
        icon={<WriterSmall />}
        label="Write"
        className={` w-fit! ${current ? "bg-bg-page! border-border-light!" : ""}`}
      />
    </SpeedyLink>
  );
};

export const ReaderButton = (props: {
  current?: boolean;
  subs: boolean;
  compactOnMobile?: boolean;
}) => {
  return (
    <SpeedyLink href={"/reader"} className="hover:no-underline!">
      <ActionButton
        nav
        labelOnMobile={!props.compactOnMobile}
        icon={<ReaderUnreadSmall />}
        label="Read"
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
