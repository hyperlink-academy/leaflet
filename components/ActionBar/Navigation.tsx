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

export type navPages = "home" | "reader" | "pub" | "discover";

export const DesktopNavigation = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
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
      onOpenAutoFocus={(e) => e.preventDefault()}
      asChild
      className="px-2! !max-w-[256px]"
      trigger={
        <div className="shrink-0 p-1 pr-2 text-accent-contrast h-full flex gap-2 font-bold items-center">
          <MenuSmall />
          <div className="truncate max-w-[72px]">
            {props.currentPage === "home" ? (
              <>Home</>
            ) : props.currentPage === "reader" ? (
              <>Reader</>
            ) : props.currentPage === "discover" ? (
              <>Discover</>
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
  console.log(identity);
  return (
    <>
      <HomeButton current={props.currentPage === "home"} />
      <ReaderButton
        current={props.currentPage === "reader"}
        subs={identity?.publication_subscriptions?.length !== 0}
      />
      <DiscoverButton current={props.currentPage === "discover"} />

      <hr className="border-border-light my-1" />
      <PublicationButtons currentPubUri={thisPublication?.uri} />
    </>
  );
};

const HomeButton = (props: { current?: boolean }) => {
  return (
    <Link href={"/home"} className="hover:!no-underline">
      <ActionButton
        nav
        icon={<HomeSmall />}
        label="Home"
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </Link>
  );
};

const ReaderButton = (props: { current?: boolean; subs: boolean }) => {
  let readerUnreads = true;

  if (!props.subs) return;
  return (
    <Link href={"/reader"} className="hover:no-underline!">
      <ActionButton
        nav
        icon={readerUnreads ? <ReaderUnreadSmall /> : <ReaderReadSmall />}
        label="Reader"
        className={`
          ${readerUnreads ? "text-accent-contrast! border-accent-contrast" : props.current ? "bg-border-light! border-border" : ""}
        `}
      />
    </Link>
  );
};

const DiscoverButton = (props: { current?: boolean }) => {
  return (
    <Link href={"/discover"} className="hover:no-underline!">
      <ActionButton
        nav
        icon={<DiscoverSmall />}
        label="Discover"
        subtext={"Explore publications!"}
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </Link>
  );
};
