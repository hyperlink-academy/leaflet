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
import { GoToArrow } from "components/Icons/GoToArrow";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { HelpSmall } from "components/Icons/HelpSmall";
import { Popover } from "components/Popover";
import { useIsMobile } from "src/hooks/isMobile";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { BlueskySmall } from "components/Icons/BlueskySmall";
import { Separator } from "components/Layout";
import { LeafletTiny } from "components/Icons/LeafletTiny";
import { ButtonPrimary } from "components/Buttons";

type NavigationProps = {
  pageTitle: React.ReactNode;
  publication?: string;
  actions?: React.ReactNode;
  tabs?: { [name: string]: { href: string; icon?: React.ReactNode } };
};

function safeDecode(p: string): string {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

function pickActiveTabHref(
  pathname: string,
  tabs: { [name: string]: { href: string } },
): string | null {
  const decodedPathname = safeDecode(pathname);
  const hrefs = Object.values(tabs).map((t) => t.href);
  let best: string | null = null;
  for (const href of hrefs) {
    const decodedHref = safeDecode(href);
    // If this href is a strict prefix of another tab's href, only allow exact
    // match — otherwise a parent tab would always swallow sibling-but-unmatched
    // paths (e.g. /reader/new highlighting /reader's Inbox tab).
    const isPrefixOfAnother = hrefs.some(
      (other) =>
        other !== href && safeDecode(other).startsWith(decodedHref + "/"),
    );
    const matches = isPrefixOfAnother
      ? decodedPathname === decodedHref
      : decodedPathname === decodedHref ||
        decodedPathname.startsWith(decodedHref + "/");
    if (matches) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

export const NavigationContent = (props: NavigationProps) => {
  let { identity } = useIdentityData();
  let pathname = usePathname();
  let activeTabHref = props.tabs
    ? pickActiveTabHref(pathname, props.tabs)
    : null;
  let onWriterPage = useIsOnWriterPage();

  return (
    <>
      {props.pageTitle} <hr className="border-border-light mb-2" />
      {props.actions && (
        <>
          <div className="flex flex-col gap-1">{props.actions}</div>
          {props.tabs && <hr className="border-border-light my-2" />}
        </>
      )}
      {props.tabs && (
        <>
          {Object.entries(props.tabs).map(([name, { href, icon }]) => (
            <SpeedyLink key={name} href={href} className="hover:no-underline!">
              <ActionButton
                labelOnMobile
                icon={icon ?? <TabsSmall />}
                label={name}
                active={href === activeTabHref}
              />
            </SpeedyLink>
          ))}
        </>
      )}
      {onWriterPage && <PublicationButtons />}
      <div className="flex-1" />
      <WriterButton />
      <ReaderButton
        subs={
          identity?.publication_subscriptions?.length !== 0 &&
          identity?.publication_subscriptions?.length !== undefined
        }
      />
      {identity?.atp_did && <NotificationButton />}
      <div className="flex gap-1 items-center">
        {identity ? (
          <>
            <hr className="border-border-light my-1" />
            <div className="grow min-w-0">
              <ProfileButton />
            </div>
          </>
        ) : (
          <div className="grow min-w-0">
            <LoginModal
              asChild
              trigger={
                <ActionButton
                  className="w-full! grow"
                  secondary
                  icon={<AccountSmall />}
                  label="Log In/Sign Up"
                />
              }
            />
          </div>
        )}
        <HelpPopover />
      </div>
    </>
  );
};

const HelpPopover = () => {
  let isMobile = useIsMobile();
  return (
    <Popover
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="w-xs max-sw-full z-[60]!"
      trigger={
        <button
          type="button"
          aria-label="About Leaflet"
          className="shrink-0 pr-2 text-tertiary"
        >
          <HelpSmall />
        </button>
      }
    >
      <div className="flex flex-col text-secondary text-center pt-2 ">
        <h3>Welcome to Leaflet!</h3>
        <div className="pb-3">
          An expressive tool for publishing blogs and newsletters
        </div>
        <div className="flex flex-col gap-1 ">
          <a
            href="https://bsky.app/profile/leaflet.pub"
            target="_blank"
            rel="noreferrer"
            className="no-underline!"
          >
            <ButtonPrimary
              compact
              fullWidth
              className="bg-[#1281F6]! border-[#1281F6]!  hover:outline-[#1281F6]! text-white!"
            >
              <BlueskyTiny className="shrink-0" />
              Follow us on Bluesky
            </ButtonPrimary>
          </a>

          <a
            href="https://lab.leaflet.pub"
            target="_blank"
            rel="noreferrer"
            className="no-underline!"
          >
            <ButtonPrimary
              compact
              fullWidth
              className="bg-[#57822B]! border-[#57822B]! hover:outline-[#57822B]! text-white!"
            >
              <LeafletTiny className="shrink-0" /> Sign up for our Newsletter
            </ButtonPrimary>
          </a>
        </div>
        <hr className="mt-3 mb-1  border-border-light" />
        <div className="text-sm flex gap-4  mx-auto pb-1">
          <SpeedyLink href="/legal" target="_blank">
            Terms
          </SpeedyLink>
          {/*
            THIS SHOULD GO TO THE LANDING PAGE
            <SpeedyLink href="/about" target="_blank">
            Learn More
            </SpeedyLink>
          */}
          <a href="mailto:contact@leaflet.pub" target="_blank" rel="noreferrer">
            Contact
          </a>
        </div>
      </div>
    </Popover>
  );
};

export const PageTitle = (props: {
  pageTitle: string;
  showBackButton?: boolean;
}) => {
  return (
    <div className="flex gap-2 w-full px-1 py-0.5 items-center ">
      {props.showBackButton && (
        <SpeedyLink href={"/home"} className="flex items-center">
          <button>
            <GoToArrowLined
              className="accent-accent-contrast rotate-180 shrink-0"
              aria-label="Go Back"
            />
          </button>
        </SpeedyLink>
      )}
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
