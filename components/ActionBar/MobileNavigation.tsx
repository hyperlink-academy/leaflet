import { useIdentityData } from "components/IdentityProvider";
import { Separator } from "components/Layout";
import {
  navPages,
  NotificationButton,
  ReaderButton,
  WriterButton,
} from "./NavigationButtons";
import { PublicationNavigation } from "./PublicationNavigation";
import { LoginModal } from "components/LoginButton";
import { ProfileButton } from "./ProfileButton";
import { ActionButton } from "./ActionButton";
import { AccountSmall } from "components/Icons/AccountSmall";
import { TabsSmall } from "components/Icons/TabsSmall";
import { Popover } from "components/Popover";
import { MenuSmall } from "components/Icons/MenuSmall";

export const MobileNavigation = (props: {
  currentPage: navPages;
  pubName?: string;
  tabs?: { [name: string]: { icon?: React.ReactNode } };
  currentTab?: string;
  onTabClick?: (tab: string) => void;
  onTabHover?: (tab: string) => void;
}) => {
  let { identity } = useIdentityData();

  let isWriterPage =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub";

  let tabClassName =
    "font-bold text-secondary flex gap-2 items-center grow min-w-0 text-sm h-[34px] px-2 accent-container min-w-0";

  return (
    <div
      className={`mobileFooter w-full flex gap-4 px-1 text-secondary grow items-center justify-between min-w-0`}
    >
      {props.currentPage === "home" ? (
        <PublicationNavigation currentPage={props.currentPage} />
      ) : props.currentPage === "pub" &&
        props.tabs &&
        Object.keys(props.tabs).length > 1 ? (
        <Popover
          className="p-1! w-48"
          trigger={
            <div className={tabClassName}>
              <MenuSmall className="shrink-0" />

              <div className="truncate w-full min-w-0">{props.pubName}</div>
            </div>
          }
        >
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
        </Popover>
      ) : null}
      <div className="spacer flex-1" />

      <div className="mobileNav flex grow gap-2 items-center justify-start ">
        <WriterButton />

        <ReaderButton
          subs={
            identity?.publication_subscriptions?.length !== 0 &&
            identity?.publication_subscriptions?.length !== undefined
          }
        />

        {identity?.atp_did && (
          <NotificationButton current={props.currentPage === "notifications"} />
        )}
        {identity ? (
          <>
            <Separator classname="h-6!" />
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
      </div>
    </div>
  );
};
