import { useIdentityData } from "components/IdentityProvider";
import { Separator } from "components/Layout";
import {
  navPages,
  NotificationButton,
  ReaderButton,
  WriterButton,
} from "./NavigationButtons";
import { PublicationNavigation } from "./Publications";
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
    props.currentPage === "pub";

  return (
    <div
      className={`mobileFooter  flex gap-2 px-1 text-secondary grow items-center justify-between`}
    >
      <div className="mobileNav flex gap-2 items-center justify-start">
        <ReaderButton
          compactOnMobile={compactOnMobile}
          current={props.currentPage === "reader"}
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />
        <WriterButton
          compactOnMobile={compactOnMobile}
          currentPage={props.currentPage}
          currentPubUri={props.currentPublicationUri}
        />

        {compactOnMobile && (
          <>
            {identity && <Separator classname="h-6!" />}
            <PublicationNavigation
              currentPage={props.currentPage}
              currentPubUri={props.currentPublicationUri}
            />
          </>
        )}
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
  );
};
