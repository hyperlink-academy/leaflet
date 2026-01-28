import { MenuSmall } from "components/Icons/MenuSmall";
import { useIdentityData } from "components/IdentityProvider";
import { Popover } from "components/Popover";
import { Separator } from "components/Layout";
import {
  HomeButton,
  navPages,
  NotificationButton,
  ReaderButton,
} from "./NavigationButtons";
import { PubIcon, PublicationButtons } from "./Publications";
import { HomeSmall } from "components/Icons/HomeSmall";
import { ReaderReadSmall } from "components/Icons/ReaderSmall";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { TagSmall } from "components/Icons/TagSmall";
import { Avatar } from "components/Avatar";
import { useProfileFromDid } from "src/utils/getRecordFromDid";

export const MobileNavigation = (props: {
  currentPage: navPages;
  currentPublicationUri?: string;
  currentProfileDid?: string;
}) => {
  let { identity } = useIdentityData();
  let thisPublication = identity?.publications?.find(
    (pub) => pub.uri === props.currentPublicationUri,
  );
  return (
    <div className="mobileNav flex gap-1 items-center text-secondary ">
      <Popover
        onOpenAutoFocus={(e) => e.preventDefault()}
        asChild
        className="px-2! !max-w-[256px]"
        trigger={
          <div className="shrink-0 p-1 h-full flex gap-1 font-bold items-center text-secondary">
            <MenuSmall />

            <CurrentPageIcon
              currentPage={props.currentPage}
              currentPubUri={thisPublication?.uri}
              currentProfileDid={props.currentProfileDid}
            />
          </div>
        }
      >
        <HomeButton current={props.currentPage === "home"} />
        <ReaderButton
          current={props.currentPage === "reader"}
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />
        <hr className="my-1 border-border-light" />
        <PublicationButtons
          currentPage={props.currentPage}
          currentPubUri={thisPublication?.uri}
        />
      </Popover>
      {identity?.atp_did && (
        <>
          <Separator classname="h-6!" />
          <NotificationButton />
        </>
      )}
    </div>
  );
};

const CurrentPageIcon = (props: {
  currentPage: navPages;
  currentPubUri?: string;
  currentProfileDid?: string;
}) => {
  let { identity } = useIdentityData();
  let currentPub = identity?.publications?.find(
    (pub) => pub.uri === props.currentPubUri,
  );
  let pubRecord = currentPub
    ? normalizePublicationRecord(currentPub.record)
    : null;
  let unreads = identity?.notifications[0]?.count;

  const { data: profile } = useProfileFromDid(
    props.currentPage === "profile" ? props.currentProfileDid : undefined,
  );

  switch (props.currentPage) {
    case "home":
      return <HomeSmall />;
    case "reader":
      return <ReaderReadSmall />;
    case "profile":
      if (profile) {
        return (
          <Avatar
            src={profile.avatar}
            displayName={profile.displayName}
            size="medium"
          />
        );
      }
      return <LooseLeafSmall />;
    case "tag":
      return <TagSmall />;
    case "notifications":
      if (unreads) {
        return <NotificationsUnreadSmall className="text-accent-contrast" />;
      } else {
        return <NotificationsReadSmall />;
      }

    case "looseleafs":
      return <LooseLeafSmall />;

    case "pub":
      if (currentPub && pubRecord) {
        return <PubIcon record={pubRecord} uri={currentPub.uri} />;
      }
      return null;
    default:
      return null;
  }
};
