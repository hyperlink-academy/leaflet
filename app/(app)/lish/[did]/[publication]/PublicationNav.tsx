"use client";
import { isExternalLink } from "src/utils/externalPublicationLink";
import { sortPublicationPages } from "./sortPublicationPages";
import { PublicationNavSubscribe } from "./PublicationNavSubscribe";
import { PublicationNavTabLink } from "./PublicationNavTabLink";
import {
  SubscribeButton,
  SubscribeInput,
} from "components/Subscribe/SubscribeButton";
import { useNavBackgroundFade } from "./useNavBackgroundFade";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";

// Pages here are published snapshots (publishedNavPages output), where path
// and title are always present.
export type PublicationNavPage = {
  id: number;
  path: string;
  title: string;
  sort_order: string;
};

// Read-only mirror of the editor's PublicationPagesNav: a sticky tab bar of
// publication pages with the subscribe control on the right. Kept visually
// identical to the editor (edit/[[...route]]/PublicationPagesEditNav.tsx).
export function PublicationNav(props: {
  publicationUrl: string;
  pages: PublicationNavPage[];
  activePath: string | null;
  showPageBackground?: boolean;
  pageWidth?: number;
  hideSubscribeInHeader?: boolean;
  subscribe?: {
    publicationUri: string;
    publicationUrl?: string;
    publicationName: string;
    publicationDescription?: string;
    newsletterMode: boolean;
  };
}) {
  let cardBorderHidden = !props.showPageBackground;
  let { navRef, bgOpacity } = useNavBackgroundFade(cardBorderHidden);

  if (props.pages.length === 0) return null;

  let sortedPages = sortPublicationPages(props.pages);
  let tabs = sortedPages.filter((page) => page.path);
  // With a single page there's nothing to navigate between, so drop the tabs
  // and center the full subscribe input where the tab bar would have been.
  let showTabs = tabs.length > 1;

  if (!showTabs)
    return (
      <div className="border-b border-border-light mt-6 w-full sm:max-w-[calc(var(--page-width-units)+.75rem)] mx-auto " />
    );
  return (
    <nav
      ref={navRef}
      className={`publicationPagesNav z-10 shrink-0 sticky  mx-1 sm:mx-2 ${cardBorderHidden ? "pt-3 bg-bg-page top-0 " : "top-2 rounded-md "}`}
    >
      {!cardBorderHidden && (
        <div
          className="absolute inset-0 -z-10 light-container pointer-events-none"
          style={{ opacity: bgOpacity }}
        />
      )}
      <div
        className={`flex items-center justify-between gap-3  w-full sm:max-w-(--page-width-units) mx-auto ${cardBorderHidden ? "px-4" : "px-2"}`}
      >
        <div className="pubPageTabs flex items-center gap-4 min-w-0 overflow-x-auto pt-1 pb-5 -mb-5">
          {tabs.map((page) => {
            let external = isExternalLink(page.path);
            let segment = page.path === "/" ? "" : page.path;
            let href = external
              ? page.path
              : `${props.publicationUrl}${segment}`;
            // External links point off-site, so they're never the active tab.
            let active = !external && props.activePath === page.path;
            return (
              <div
                key={page.id}
                className={`shrink-0 ${
                  active
                    ? "text-accent-contrast"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                <PublicationNavTabLink
                  href={href}
                  external={external}
                  active={active}
                >
                  {page.title || page.path} {external && <ExternalLinkTiny />}
                </PublicationNavTabLink>
              </div>
            );
          })}
        </div>

        <div className="sm:block hidden min-w-0 w-fit">
          {props.subscribe && props.hideSubscribeInHeader && (
            <SubscribeButton {...props.subscribe} />
          )}
        </div>
      </div>
      <div
        className="border-b border-border-light"
        style={cardBorderHidden ? undefined : { opacity: 1 - bgOpacity }}
      />
    </nav>
  );
}
