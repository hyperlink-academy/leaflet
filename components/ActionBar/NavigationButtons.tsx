"use client";
import { useContext } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardIdContext } from "components/PageLayouts/dashboardState";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { WriterSmall } from "components/Icons/WriterSmall";
import { ButtonPrimary } from "components/Buttons";
import { LoginModal } from "components/LoginButton";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { TutorialNavTooltip } from "app/(app)/(identity)/(home-pages)/(writer)/home/Tutorial/TutorialNavTooltip";
const WRITER_PATHS = ["/home", "/looseleafs", "/notifications"] as const;

export function useIsOnWriterPage() {
  let pathname = usePathname();
  return WRITER_PATHS.some((p) => pathname.startsWith(p));
}

// The reader-side dashboards, keyed by the id their shell registers. Profile
// and tag count as reading even though they aren't under /reader — their own
// sidebar tabs are the reader's (Inbox/Trending/New). Everything else — the
// writer pages, publication dashboards (whose id is the publication uri) —
// is writing.
const READER_DASHBOARD_IDS = ["reader", "tag", "profile"];

export function useNavSide(): "reader" | "writer" {
  let dashboardId = useContext(DashboardIdContext);
  return dashboardId && READER_DASHBOARD_IDS.includes(dashboardId)
    ? "reader"
    : "writer";
}

export function NavigationButton() {
  let side = useNavSide();
  return (
    <TutorialNavTooltip target="banner" className="w-full">
      {side === "reader" ? <WriterButton /> : <ReaderButton />}
    </TutorialNavTooltip>
  );
}

export const WriterButton = () => {
  let { identity } = useIdentityData();
  let hasDocs =
    (identity?.permission_token_on_homepage.length ?? 0) > 0 ||
    (identity?.contributor_leaflets?.length ?? 0) > 0;

  if (identity && hasDocs)
    return (
      <SpeedyLink eager href={"/home"} className="hover:no-underline!">
        <ButtonPrimary fullWidth className="mx-auto">
          <WriterSmall />
          Write <GoToArrowLined />
        </ButtonPrimary>
      </SpeedyLink>
    );

  return (
    <div className="accent-container flex flex-col justify-center gap-1 px-2 py-3 text-center text-sm leading-snug mb-2">
      <WriterSmall className="mx-auto" />
      <h4 className="leading-snug">Start a Publication with Leaflet</h4>
      <small className="text-secondary pb-2">
        A blog, newsletter, comic, novel, course, log, journal, zine…
      </small>
      {identity ? (
        <SpeedyLink eager href="/home" className="hover:no-underline!">
          <ButtonPrimary fullWidth className="mx-auto ">
            Start Writing! <GoToArrowLined />
          </ButtonPrimary>
        </SpeedyLink>
      ) : (
        <LoginModal
          asChild
          redirectRoute="/home"
          trigger={
            <ButtonPrimary fullWidth className="mx-auto ">
              Start Writing!
              <GoToArrowLined />
            </ButtonPrimary>
          }
        />
      )}
    </div>
  );
};

export const ReaderButton = () => {
  let { identity } = useIdentityData();
  let hasSubs = (identity?.publication_subscriptions?.length ?? 0) > 0;

  if (identity && hasSubs)
    return (
      <SpeedyLink eager href={"/reader"} className="hover:no-underline!">
        <ButtonPrimary fullWidth className="mx-auto">
          <ReaderUnreadSmall />
          Read <GoToArrowLined />
        </ButtonPrimary>
      </SpeedyLink>
    );

  return (
    <SpeedyLink eager href="/reader/trending" className="hover:no-underline!">
      <ButtonPrimary fullWidth className="mx-auto">
        <ReaderUnreadSmall />
        Explore Pubs <GoToArrowLined />
      </ButtonPrimary>
    </SpeedyLink>
  );
};

export function NotificationButton() {
  let { identity } = useIdentityData();
  let unreads = identity?.notifications[0]?.count;

  let pathname = usePathname();
  let searchParams = useSearchParams();
  let router = useRouter();

  let isOnPage =
    pathname === "/notifications" || pathname.startsWith("/notifications/");
  let isOpen = searchParams.get("notifications") === "open";
  let active = isOnPage || isOpen;

  function handleClick() {
    if (isOnPage || isOpen) return;
    let params = new URLSearchParams(searchParams.toString());
    params.set("notifications", "open");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <ActionButton
      type="button"
      onClick={handleClick}
      labelOnMobile={false}
      icon={
        unreads ? (
          <NotificationsUnreadSmall className="text-accent-contrast" />
        ) : (
          <NotificationsReadSmall />
        )
      }
      label={
        unreads ? (
          <span className="flex items-center justify-between gap-1.5">
            Notifications
            <span className="min-w-6 h-fit px-1 py-0.5 rounded-full bg-accent-1 text-accent-2 text-sm leading-none font-bold flex items-center justify-center max-w-full truncate">
              {unreads}
            </span>
          </span>
        ) : (
          "Notifications"
        )
      }
      active={active}
      className={unreads ? "text-accent-contrast! font-bold w-full!" : "w-full"}
    />
  );
}
