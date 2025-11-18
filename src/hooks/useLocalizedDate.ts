"use client";
import { useContext, useMemo } from "react";
import { DateTime } from "luxon";
import { RequestHeadersContext } from "components/Providers/RequestHeadersProvider";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";

/**
 * Hook that formats a date string using Luxon with timezone and locale from request headers.
 * On initial page load, uses the timezone from request headers. After hydration, uses the system timezone.
 *
 * @param dateString - ISO date string to format
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 *
 * @example
 * const formatted = useLocalizedDate("2024-01-15T10:30:00Z", { dateStyle: 'full', timeStyle: 'short' });
 */
export function useLocalizedDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const { timezone, language } = useContext(RequestHeadersContext);
  const hasPageLoaded = useHasPageLoaded();

  return useMemo(() => {
    // Parse the date string to Luxon DateTime
    let dateTime = DateTime.fromISO(dateString);

    // On initial page load, use header timezone. After hydration, use system timezone
    const effectiveTimezone = !hasPageLoaded
      ? timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Apply timezone if available
    if (effectiveTimezone) {
      dateTime = dateTime.setZone(effectiveTimezone);
    }

    // On initial page load, use header locale. After hydration, use system locale
    // Parse locale from accept-language header (take first locale)
    // accept-language format: "en-US,en;q=0.9,es;q=0.8"
    const effectiveLocale = !hasPageLoaded
      ? language?.split(",")[0]?.split(";")[0]?.trim() || "en-US"
      : Intl.DateTimeFormat().resolvedOptions().locale;

    try {
      return dateTime.toLocaleString(options, { locale: effectiveLocale });
    } catch (error) {
      // Fallback to en-US if locale is invalid
      return dateTime.toLocaleString(options, { locale: "en-US" });
    }
  }, [dateString, options, timezone, language, hasPageLoaded]);
}
