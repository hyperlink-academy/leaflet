import { SpeedyLink } from "components/SpeedyLink";
import { sortPublicationPages } from "./sortPublicationPages";
import { PublicationNavSubscribe } from "./PublicationNavSubscribe";
import {
  SubscribeButton,
  SubscribeInput,
} from "components/Subscribe/SubscribeButton";

export type PublicationNavPage = {
  id: number;
  path: string | null;
  title: string | null;
  sort_order: string;
};

// Read-only mirror of the editor's PublicationPagesNav: a sticky tab bar of
// publication pages with the subscribe control on the right. Kept visually
// identical to the editor (edit/[[...route]]/PublicationPagesNav.tsx).
export function PublicationNav(props: {
  publicationUrl: string;
  pages: PublicationNavPage[];
  activePath: string | null;
  subscribe?: {
    publicationUri: string;
    publicationUrl?: string;
    publicationName: string;
    publicationDescription?: string;
    newsletterMode: boolean;
  };
}) {
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
    <nav className="publicationPagesNav sticky top-0 z-10 bg-bg-page shrink-0 w-full sm:max-w-[calc(var(--page-width-units)+.75rem)] mx-auto pt-3">
      <div className="flex items-baseline justify-between gap-6 px-3 sm:px-4 w-full sm:max-w-(--page-width-units) mx-auto">
        <div className="pubPageTabs flex items-center gap-4 min-w-0 overflow-x-auto pt-2 pb-5 -mb-5">
          {tabs.map((page) => {
            let segment = page.path === "/" ? "" : page.path;
            let href = `${props.publicationUrl}${segment}`;
            let active = props.activePath === page.path;
            return (
              <div
                key={page.id}
                className={`shrink-0 ${
                  active
                    ? "text-accent-contrast"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                <SpeedyLink
                  href={href}
                  className={`block px-1 pt-1 pb-0.5 text-sm font-bold text-inherit hover:no-underline! select-none border-b-3 ${
                    active ? "border-accent-contrast" : "border-transparent"
                  }`}
                >
                  {page.title || page.path}
                </SpeedyLink>
              </div>
            );
          })}
        </div>
        )
        <div className="sm:block hidden min-w-0 w-fit pb-1">
          {props.subscribe && <SubscribeButton {...props.subscribe} />}
        </div>
      </div>
      <div className="border-b border-border-light" />
    </nav>
  );
}
