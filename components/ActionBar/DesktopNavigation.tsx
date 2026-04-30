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

type NavigationProps = {
  pageTitle: React.ReactNode;
  currentPage: navPages;
  publication?: string;
  actions?: React.ReactNode;
  tabs?: { [name: string]: { icon?: React.ReactNode } };
  currentTab?: string;
  onTabClick?: (tab: string) => void;
  onTabHover?: (tab: string) => void;
};

export const NavigationContent = (props: NavigationProps) => {
  let { identity } = useIdentityData();

  let isWriterPage =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub";

  return (
    <>
      {props.pageTitle}
      <hr className="border-border-light mb-2" />

      {props.actions && (
        <>
          <div className="flex flex-col gap-1 pt-0.5">{props.actions}</div>
          <hr className="border-border-light my-2" />
        </>
      )}
      {props.tabs && Object.keys(props.tabs).length > 1 && (
        <>
          {Object.keys(props.tabs).map((t) => (
            <ActionButton
              labelOnMobile
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
          <hr className="border-border-light my-2" />
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
              className="w-full!"
              secondary
              icon={<AccountSmall />}
              label="Log In/Sign Up"
            />
          }
        />
      )}
    </>
  );
};

export const PageTitle = (props: {
  pageTitle: string;
  icon: React.ReactNode;
}) => {
  return (
    <div className="flex gap-2 w-full px-1 py-0.5 items-center ">
      {/*{props.icon}*/}
      <div className="truncate min-w-0 text-tertiary uppercase text-sm font-bold">
        {props.pageTitle}
      </div>
    </div>
  );
};

export const DesktopNavigation = (props: NavigationProps) => {
  return (
    <Sidebar alwaysOpen>
      <NavigationContent {...props} />
    </Sidebar>
  );
};
