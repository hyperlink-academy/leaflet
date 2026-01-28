import { useIdentityData } from "components/IdentityProvider";
import {
  navPages,
  HomeButton,
  ReaderButton,
  NotificationButton,
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
  return (
    <div className="flex flex-col gap-3">
      <Sidebar alwaysOpen>
        <HomeButton current={props.currentPage === "home"} />
        <ReaderButton
          current={props.currentPage === "reader"}
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />
        {identity?.atp_did && (
          <NotificationButton current={props.currentPage === "notifications"} />
        )}
      </Sidebar>
      <Sidebar alwaysOpen>
        <PublicationButtons
          currentPage={props.currentPage}
          currentPubUri={thisPublication?.uri}
        />
      </Sidebar>
    </div>
  );
};
