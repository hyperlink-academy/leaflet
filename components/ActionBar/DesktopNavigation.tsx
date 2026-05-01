"use client";
import { usePathname } from "next/navigation";
import { useIdentityData } from "components/IdentityProvider";
import {
  NotificationButton,
  ReaderButton,
  WriterButton,
  useIsOnWriterPage,
} from "./NavigationButtons";
import { PublicationButtons } from "./Publications";
import { Sidebar } from "./Sidebar";
import { LoginModal } from "components/LoginButton";
import { ProfileButton } from "./ProfileButton";
import { ActionButton } from "./ActionButton";
import { AccountSmall } from "components/Icons/AccountSmall";
import { TabsSmall } from "components/Icons/TabsSmall";
import { SpeedyLink } from "components/SpeedyLink";

type NavigationProps = {
  pageTitle: React.ReactNode;
  publication?: string;
  actions?: React.ReactNode;
  tabs?: { [name: string]: { href: string; icon?: React.ReactNode } };
};

function pickActiveTabHref(
  pathname: string,
  tabs: { [name: string]: { href: string } },
): string | null {
  const hrefs = Object.values(tabs).map((t) => t.href);
  let best: string | null = null;
  for (const href of hrefs) {
    // If this href is a strict prefix of another tab's href, only allow exact
    // match — otherwise a parent tab would always swallow sibling-but-unmatched
    // paths (e.g. /reader/new highlighting /reader's Inbox tab).
    const isPrefixOfAnother = hrefs.some(
      (other) => other !== href && other.startsWith(href + "/"),
    );
    const matches = isPrefixOfAnother
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
    if (matches) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

export const NavigationContent = (props: NavigationProps) => {
  let { identity } = useIdentityData();
  let pathname = usePathname();
  let activeTabHref = props.tabs ? pickActiveTabHref(pathname, props.tabs) : null;
  let onWriterPage = useIsOnWriterPage();

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

      {props.tabs &&
        Object.entries(props.tabs).map(([name, { href, icon }]) => (
          <SpeedyLink key={name} href={href} className="hover:no-underline!">
            <ActionButton
              labelOnMobile
              icon={icon ?? <TabsSmall />}
              label={name}
              active={href === activeTabHref}
            />
          </SpeedyLink>
        ))}

      {onWriterPage && (
        <>
          <hr className="border-border-light my-2" />
          <div className="text-tertiary uppercase text-sm px-1 pt-1">
            PUBLICATIONS
          </div>
          <PublicationButtons />
        </>
      )}

      <div className="flex-1" />
      <WriterButton />
      <ReaderButton
        subs={
          identity?.publication_subscriptions?.length !== 0 &&
          identity?.publication_subscriptions?.length !== undefined
        }
      />
      {identity?.atp_did && <NotificationButton />}
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
      {props.icon}
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
