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
import { NotificationsUnreadSmall } from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { NotificationInstance } from "twilio/lib/rest/api/v2010/account/notification";
import { getIdentityData } from "actions/getIdentityData";
import { redirect } from "next/navigation";
import { hydrateNotifications } from "src/notifications";
import { supabaseServerClient } from "supabase/serverClient";
import { CommentNotification } from "app/(home-pages)/notifications/CommentNotication";

export type navPages = "home" | "reader" | "pub" | "discover" | "notifications";

export const DesktopNavigation = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <Sidebar alwaysOpen>
        <NotificationButton />
      </Sidebar>
      <Sidebar alwaysOpen>
        <NavigationOptions
          currentPage={props.currentPage}
          publication={props.publication}
        />
      </Sidebar>
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
    <div className="flex gap-1 pr-2">
      <NotificationButton />

      <Popover
        onOpenAutoFocus={(e) => e.preventDefault()}
        asChild
        className="px-2! !max-w-[256px]"
        trigger={
          <div className="shrink-0 p-1 text-accent-contrast h-full flex gap-2 font-bold items-center">
            <MenuSmall />
            {props.currentPage !== "notifications" && (
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
            )}
          </div>
        }
      >
        <NavigationOptions
          currentPage={props.currentPage}
          publication={props.publication}
          isMobile
        />
      </Popover>
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
        subs={identity?.publication_subscriptions?.length !== 0}
      />
      <DiscoverButton current={props.currentPage === "discover"} />
      {/*{identity && (
        <>
          <hr className="border-dashed border-border-light" />
          <NotificationButton current={props.currentPage === "notifications"} />
        </>
      )}*/}

      <hr className="border-border-light my-1" />
      <PublicationButtons currentPubUri={thisPublication?.uri} />
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
  let readerUnreads = false;

  if (!props.subs) return;
  return (
    <SpeedyLink href={"/reader"} className="hover:no-underline!">
      <ActionButton
        nav
        icon={readerUnreads ? <ReaderUnreadSmall /> : <ReaderReadSmall />}
        label="Reader"
        className={`
          ${readerUnreads && "text-accent-contrast!"}
          ${props.current && "border-accent-contrast!"}
        `}
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

function NotificationButton(props: { current?: boolean }) {
  // let identity = await getIdentityData();
  // if (!identity?.atp_did) return;
  // let { data } = await supabaseServerClient
  //   .from("notifications")
  //   .select("*")
  //   .eq("recipient", identity.atp_did);
  // let notifications = await hydrateNotifications(data || []);

  return (
    <Popover
      asChild
      trigger={
        <ActionButton
          icon={<NotificationsUnreadSmall />}
          label="Notifications"
          className={props.current ? "bg-bg-page! border-border-light!" : ""}
        />
      }
    >
      <div className="flex flex-col gap-6 pt-3">
        {/*{notifications.map((n) => {
          if (n.type === "comment") {
            n;
            return <CommentNotification key={n.id} {...n} />;
          }
        })}*/}
      </div>
      <SpeedyLink href={"/notifications"}>See All</SpeedyLink>
    </Popover>
  );
}
