import { HomeSmall } from "components/Icons/HomeSmall";
import {
  NotificationsUnreadSmall,
  NotificationsReadSmall,
} from "components/Icons/NotificationSmall";
import {
  ReaderUnreadSmall,
  ReaderReadSmall,
} from "components/Icons/ReaderSmall";
import { ActionButton } from "./ActionButton";
import { Sidebar } from "./Sidebar";
import { useIdentityData } from "components/IdentityProvider";
import Link from "next/link";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { PubIcon, PublicationButtons, PublicationOption } from "./Publications";
import { Popover } from "components/Popover";
import { PubLeafletPublication } from "lexicons/api";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { MenuSmall } from "components/Icons/MenuSmall";

export type navPages = "home" | "reader" | "pub";

export const DesktopNavigation = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
  let unreadNotifications = true;

  return (
    <div className="flex flex-col gap-4">
      <Sidebar alwaysOpen>
        <NavigationOptions
          currentPage={props.currentPage}
          publication={props.publication}
        />
      </Sidebar>
      {/*<Sidebar alwaysOpen>
        <ActionButton
          icon={
            unreadNotifications ? (
              <NotificationsUnreadSmall />
            ) : (
              <NotificationsReadSmall />
            )
          }
          label="Notifications"
        />
      </Sidebar>*/}
    </div>
  );
};

export const MobileNavigation = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
  let { identity } = useIdentityData();
  let thisPublication = identity?.publications?.find(
    (pub) => pub.uri === props.publication,
  );
  return (
    <Popover
      asChild
      className="px-2! !max-w-[256px]"
      trigger={
        <div className="shrink-0 p-1 pr-2 text-accent-contrast h-full flex gap-2 font-bold items-center">
          <MenuSmall />
          <div className="truncate max-w-[64px]">
            {props.currentPage === "home" ? (
              <>Home</>
            ) : props.currentPage === "reader" ? (
              <>Reader</>
            ) : props.currentPage === "pub" ? (
              thisPublication && <>{thisPublication.name}</>
            ) : null}
          </div>
        </div>
      }
    >
      <NavigationOptions
        currentPage={props.currentPage}
        publication={props.publication}
      />
    </Popover>
  );
};

const NavigationOptions = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
  let { identity } = useIdentityData();
  let thisPublication = identity?.publications?.find(
    (pub) => pub.uri === props.publication,
  );
  return (
    <>
      <HomeButton current={props.currentPage === "home"} />
      <ReaderButton current={props.currentPage === "reader"} />
      <hr className="border-border-light my-1" />
      <PublicationButtons currentPubUri={thisPublication?.uri} />
    </>
  );
};

const HomeButton = (props: { current?: boolean }) => {
  return (
    <Link href={"/home"} className="hover:no-underline!">
      <ActionButton
        nav
        icon={<HomeSmall />}
        label="Home"
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </Link>
  );
};

const ReaderButton = (props: { current?: boolean }) => {
  // let readerUnreads = true;
  // let subs = false;

  // if (subs)
  //   return (
  //     <ActionButton
  //       nav
  //       icon={readerUnreads ? <ReaderUnreadSmall /> : <ReaderReadSmall />}
  //       label="Reader"
  //       className={`
  //         ${readerUnreads ? "text-accent-contrast! border-accent-contrast" : props.current ? "bg-border-light! border-border" : ""}
  //       `}
  //     />
  //   );
  return (
    <Link href={"/discover"} className="hover:no-underline!">
      <ActionButton
        nav
        icon={<DiscoverSmall />}
        label="Discover"
        subtext={
          !props.current ? "Check out what others are writing!" : undefined
        }
        className={props.current ? "bg-border-light! border-border" : ""}
      />
    </Link>
  );
};
