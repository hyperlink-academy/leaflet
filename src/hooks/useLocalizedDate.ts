"use client";
import { useContext, useMemo } from "react";
import { DateTime } from "luxon";
import { RequestHeadersContext } from "components/Providers/RequestHeadersProvider";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";

// On initial page load, use the timezone and locale from the request headers.
// After hydration, use the system's.
function useLocalizedDateTime(dateString: string) {
  const { timezone, language } = useContext(RequestHeadersContext);
  const hasPageLoaded = useHasPageLoaded();

  return useMemo(() => {
    let dateTime = DateTime.fromISO(dateString);

    const effectiveTimezone = !hasPageLoaded
      ? timezone || "UTC"
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (effectiveTimezone) {
      dateTime = dateTime.setZone(effectiveTimezone);
    }

    // Parse locale from accept-language header (take first locale)
    // accept-language format: "en-US,en;q=0.9,es;q=0.8"
    const effectiveLocale = !hasPageLoaded
      ? language?.split(",")[0]?.split(";")[0]?.trim() || "en-US"
      : Intl.DateTimeFormat().resolvedOptions().locale;

    return { dateTime, effectiveLocale };
  }, [dateString, timezone, language, hasPageLoaded]);
}

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
  const { dateTime, effectiveLocale } = useLocalizedDateTime(dateString);

  return useMemo(() => {
    try {
      return dateTime.toLocaleString(options, { locale: effectiveLocale });
    } catch (error) {
      // Fallback to en-US if locale is invalid
      return dateTime.toLocaleString(options, { locale: "en-US" });
    }
  }, [dateTime, options, effectiveLocale]);
}

/**
 * Same formatting as `useLocalizedDate`, but broken into its Intl parts, for
 * callers that need to style or rewrite a single part (e.g. an abbreviated
 * year) without hardcoding a locale's date order.
 */
export function useLocalizedDateParts(
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatPart[] {
  const { dateTime, effectiveLocale } = useLocalizedDateTime(dateString);

  return useMemo(() => {
    try {
      return dateTime.setLocale(effectiveLocale).toLocaleParts(options);
    } catch (error) {
      return dateTime.setLocale("en-US").toLocaleParts(options);
    }
  }, [dateTime, options, effectiveLocale]);
}
