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
        icon={<HomeSmall />}
        label="Home"
        className={`${props.current ? "bg-bg-page! border-border-light!" : ""} w-full! ${props.className}`}
      />
    </SpeedyLink>
  );
};

export const WriterButton = (props: {
  currentPubUri?: string;
  compactOnMobile?: boolean;
}) => {
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton icon={<WriterSmall />} label="Write" />
    </SpeedyLink>
  );
};

export const ReaderButton = (props: {
  subs: boolean;
  compactOnMobile?: boolean;
}) => {
  return (
    <SpeedyLink href={"/reader"} className="hover:no-underline!">
      <ActionButton icon={<ReaderUnreadSmall />} label="Read" />
    </SpeedyLink>
  );
};

export function NotificationButton(props: { current?: boolean }) {
  let { identity } = useIdentityData();
  let unreads = identity?.notifications[0]?.count;

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
        className={`${props.current ? "bg-bg-page! border-border-light!" : ""} ${unreads ? "text-accent-contrast!" : ""}`}
      />
    </SpeedyLink>
  );
}
