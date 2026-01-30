import { MenuSmall } from "components/Icons/MenuSmall";
import { useIdentityData } from "components/IdentityProvider";
import { Popover } from "components/Popover";
import { Separator } from "components/Layout";
import {
  HomeButton,
  navPages,
  NotificationButton,
  ReaderButton,
  WriterButton,
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
import { LoginActionButton } from "components/LoginButton";

export const MobileNavigation = (props: {
  currentPage: navPages;
  currentPublicationUri?: string;
  currentProfileDid?: string;
}) => {
  let { identity } = useIdentityData();

  let compactOnMobile =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub"
      ? false
      : true;

  return (
    <div
      className={`mobileNav  flex justify-between gap-1 items-center text-secondary pl-1 ${compactOnMobile ? "w-full" : "w-fit"}`}
    >
      <div className="flex gap-2">
        <WriterButton
          compactOnMobile={compactOnMobile}
          currentPage={props.currentPage}
          currentPubUri={props.currentPublicationUri}
        />
        <ReaderButton
          compactOnMobile={compactOnMobile}
          current={props.currentPage === "reader"}
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />
      </div>
      {identity?.atp_did ? (
        <>
          {!compactOnMobile && <Separator />}
          <NotificationButton />
        </>
      ) : (
        <LoginActionButton />
      )}
    </div>
  );
};
