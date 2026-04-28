import { useIdentityData } from "components/IdentityProvider";
import {
  navPages,
  NotificationButton,
  ReaderButton,
  WriterButton,
} from "./NavigationButtons";
import { PublicationButtons } from "./Publications";
import { Sidebar } from "./Sidebar";
import { LoginModal } from "components/LoginButton";
import { ProfileButton } from "./ProfileButton";
import { ActionButton } from "./ActionButton";
import { AccountSmall } from "components/Icons/AccountSmall";
import { TabsSmall } from "components/Icons/TabsSmall";

export const DesktopNavigation = (props: {
  currentPage: navPages;
  publication?: string;
  actions?: React.ReactNode;
  tabs?: { [name: string]: { icon?: React.ReactNode } };
  currentTab?: string;
  onTabClick?: (tab: string) => void;
  onTabHover?: (tab: string) => void;
}) => {
  let { identity } = useIdentityData();
  let thisPublication = identity?.publications?.find(
    (pub) => pub.uri === props.publication,
  );

  let isWriterPage =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub";

  return (
    <Sidebar alwaysOpen>
      {props.actions}

      {props.tabs && Object.keys(props.tabs).length > 1 && (
        <>
          <hr className="border-border-light border-dashed my-1" />
          {Object.keys(props.tabs).map((t) => (
            <ActionButton
              key={t}
              icon={props.tabs![t].icon ?? <TabsSmall />}
              label={t}
              className={
                t === props.currentTab ? "bg-bg-page! border-border-light!" : ""
              }
              onClick={() => props.onTabClick?.(t)}
              onMouseEnter={() => props.onTabHover?.(t)}
              onPointerDown={() => props.onTabHover?.(t)}
            />
          ))}
        </>
      )}

      {props.currentPage === "home" && (
        <>
          <hr className="border-border-light my-1" />
          <div className="text-tertiary uppercase text-sm px-1 pt-1">
            PUBLICATIONS
          </div>
          <PublicationButtons currentPage={props.currentPage} />
        </>
      )}

      <div className="flex-1" />
      <WriterButton />
      {isWriterPage && (
        <ReaderButton
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />
      )}
      {identity?.atp_did && (
        <NotificationButton current={props.currentPage === "notifications"} />
      )}
      {identity ? (
        <>
          <hr className="border-border-light my-1" />
          <ProfileButton />
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
  );
};
