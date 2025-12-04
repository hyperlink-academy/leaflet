import { HomeSmall } from "components/Icons/HomeSmall";
import { ActionButton } from "./ActionButton";
import { Sidebar } from "./Sidebar";
import { useIdentityData } from "components/IdentityProvider";
import Link from "next/link";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { PublicationButtons } from "./Publications";
import { Popover } from "components/Popover";
import { MenuSmall } from "components/Icons/MenuSmall";
import {
  ReaderReadSmall,
  ReaderUnreadSmall,
} from "components/Icons/ReaderSmall";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { Separator } from "components/Layout";

export type navPages =
  | "home"
  | "reader"
  | "pub"
  | "discover"
  | "notifications"
  | "looseleafs"
  | "tag";

export const DesktopNavigation = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
  let { identity } = useIdentityData();
  return (
    <div className="flex flex-col gap-3">
      <Sidebar alwaysOpen>
        <NavigationOptions
          currentPage={props.currentPage}
          publication={props.publication}
        />
      </Sidebar>
      {identity?.atp_did && (
        <Sidebar alwaysOpen>
          <NotificationButton current={props.currentPage === "notifications"} />
        </Sidebar>
      )}
    </div>
  );
};

export const MobileNavigation = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
  let { identity } = useIdentityData();

  return (
    <div className="flex gap-1 ">
      <Popover
        onOpenAutoFocus={(e) => e.preventDefault()}
        asChild
        className="px-2! !max-w-[256px]"
        trigger={
          <div className="shrink-0 p-1 text-accent-contrast h-full flex gap-2 font-bold items-center">
            <MenuSmall />
          </div>
        }
      >
        <NavigationOptions
          currentPage={props.currentPage}
          publication={props.publication}
          isMobile
        />
      </Popover>
      {identity?.atp_did && (
        <>
          <Separator />
          <NotificationButton />
        </>
      )}
    </div>
  );
};

const NavigationOptions = (props: {
  currentPage: navPages;
  publication?: string;
  isMobile?: boolean;
}) => {
  let { identity } = useIdentityData();
  let thisPublication = identity?.publications?.find(
    (pub) => pub.uri === props.publication,
  );
  return (
    <>
      <HomeButton current={props.currentPage === "home"} />
      <ReaderButton
        current={props.currentPage === "reader"}
        subs={
          identity?.publication_subscriptions?.length !== 0 &&
          identity?.publication_subscriptions?.length !== undefined
        }
      />
      <DiscoverButton current={props.currentPage === "discover"} />

      <hr className="border-border-light my-1" />
      <PublicationButtons
        currentPage={props.currentPage}
        currentPubUri={thisPublication?.uri}
      />
    </>
  );
};

const HomeButton = (props: { current?: boolean }) => {
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

const ReaderButton = (props: { current?: boolean; subs: boolean }) => {
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

const DiscoverButton = (props: { current?: boolean }) => {
  return (
    <Link href={"/discover"} className="hover:no-underline!">
      <ActionButton
        nav
        icon={<DiscoverSmall />}
        label="Discover"
        subtext=""
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </Link>
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
