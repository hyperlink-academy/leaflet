import { useIdentityData } from "components/IdentityProvider";
import {
  navPages,
  HomeButton,
  ReaderButton,
  NotificationButton,
  WriterButton,
} from "./NavigationButtons";
import { PublicationButtons } from "./Publications";
import { Sidebar } from "./Sidebar";
import { LoginModal } from "components/LoginButton";
import { ProfileButton } from "./ProfileButton";
import { ActionButton } from "./ActionButton";
import { AccountSmall } from "components/Icons/AccountSmall";

export const DesktopNavigation = (props: {
  currentPage: navPages;
  publication?: string;
}) => {
  let { identity } = useIdentityData();
  let thisPublication = identity?.publications?.find(
    (pub) => pub.uri === props.publication,
  );

  let currentlyWriter =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub";
  return (
    <div className="flex flex-col gap-3">
      <Sidebar alwaysOpen>
        {identity ? (
          <>
            <ProfileButton />
            {identity.atp_did && (
              <NotificationButton
                current={props.currentPage === "notifications"}
              />
            )}
          </>
        ) : (
          <LoginModal
            asChild
            trigger={
              <ActionButton
                secondary
                icon={<AccountSmall />}
                label="Log In/Sign Up"
              />
            }
          />
        )}
      </Sidebar>

      <Sidebar alwaysOpen>
        <ReaderButton
          current={props.currentPage === "reader"}
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />
        <WriterButton
          currentPage={props.currentPage}
          currentPubUri={thisPublication?.uri}
        />
        {currentlyWriter && (
          <>
            <hr className="border-border-light border-dashed" />
            <PublicationButtons
              currentPage={props.currentPage}
              currentPubUri={thisPublication?.uri}
            />
          </>
        )}
      </Sidebar>
    </div>
  );
};
