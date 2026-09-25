export type PageLinkDisplay = "full" | "compact";

export const DEFAULT_PAGE_LINK_DISPLAY: PageLinkDisplay = "full";

export function isPageLinkDisplay(value: unknown): value is PageLinkDisplay {
  return value === "full" || value === "compact";
}

// Anything that isn't a known value (missing fact, unrecognized knownValue
// from a newer client, garbage in localStorage) renders as the default.
export function normalizePageLinkDisplay(value: unknown): PageLinkDisplay {
  return isPageLinkDisplay(value) ? value : DEFAULT_PAGE_LINK_DISPLAY;
}
