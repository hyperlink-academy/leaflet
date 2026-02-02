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
import { ButtonPrimary } from "components/Buttons";

export const MobileNavigation = (props: {
  currentPage: navPages;
  currentPublicationUri?: string;
  currentProfileDid?: string;
}) => {
  let { identity } = useIdentityData();

  let compactOnMobile =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub";
  function getPubIcons() {
    let hasLooseleafs = !!identity?.permission_token_on_homepage.find(
      (f) =>
        f.permission_tokens.leaflets_to_documents &&
        f.permission_tokens.leaflets_to_documents[0]?.document,
    );

    if (identity && identity.publications.length >= 1) {
      return (
        <div className="pubNav flex gap-2 font-bold">
          Publications
          <div className="flex">
            {identity.publications.map((pub, index) => {
              if (index <= 3)
                return (
                  <PubIcon
                    key={pub.uri}
                    record={normalizePublicationRecord(pub.record)}
                    uri={pub.uri}
                    className="-ml-4 first:ml-0"
                  />
                );
            })}
          </div>
        </div>
      );
    }
    if (identity && hasLooseleafs) {
      return (
        <div className="bg-bg-leaflet rounded-full  ">
          <LooseLeafSmall className="scale-[75%]" />
        </div>
      );
    } else
      return (
        <ButtonPrimary compact className="text-sm!">
          Create a Publication!
        </ButtonPrimary>
      );
  }

  return (
    <div
      className={`mobileNav  flex justify-between gap-1 items-center text-secondary px-1 w-full `}
    >
      <div
        className={`flex gap-2 grow items-center ${compactOnMobile ? "justify-start" : "justify-between"}`}
      >
        <div className="flex gap-2 items-center justify-start">
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
            {compactOnMobile && <Separator classname="h-6!" />}
            <NotificationButton />
          </>
        ) : (
          <LoginActionButton />
        )}
      </div>

      {compactOnMobile && (
        <Popover trigger={getPubIcons()} className="pt-1 px-2!">
          <HomeButton
            current={props.currentPage === "home"}
            className="flex-row-reverse! justify-end!"
          />
          <hr className="my-1 border-border-light" />
          <PublicationButtons
            currentPage={props.currentPage}
            currentPubUri={props.currentPublicationUri}
            className="justify-end!"
            optionClassName=" flex-row-reverse!"
          />
        </Popover>
      )}
    </div>
  );
};
