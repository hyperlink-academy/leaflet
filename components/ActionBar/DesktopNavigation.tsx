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
      {identity?.atp_did && (
        <Sidebar alwaysOpen>
          <NotificationButton current={props.currentPage === "notifications"} />
        </Sidebar>
      )}
      <Sidebar alwaysOpen>
        <ReaderButton
          current={props.currentPage === "reader"}
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />
        {currentlyWriter ? (
          <>
            <HomeButton current={props.currentPage === "home"} />
            <hr className="border-border-light border-dashed" />
            <PublicationButtons
              currentPage={props.currentPage}
              currentPubUri={thisPublication?.uri}
            />
          </>
        ) : (
          <WriterButton
            currentPage={props.currentPage}
            currentPubUri={thisPublication?.uri}
          />
        )}
      </Sidebar>
    </div>
  );
};
