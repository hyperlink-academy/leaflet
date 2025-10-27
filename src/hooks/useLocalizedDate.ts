"use client";
import { useContext, useMemo } from "react";
import { DateTime } from "luxon";
import { RequestHeadersContext } from "components/Providers/RequestHeadersProvider";

/**
 * Hook that formats a date string using Luxon with timezone and locale from request headers.
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

  return useMemo(() => {
    // Parse the date string to Luxon DateTime
    let dateTime = DateTime.fromISO(dateString);

    // Apply timezone if available
    if (timezone) {
      dateTime = dateTime.setZone(timezone);
    }

    // Parse locale from accept-language header (take first locale)
    // accept-language format: "en-US,en;q=0.9,es;q=0.8"
    const locale = language?.split(",")[0]?.split(";")[0]?.trim() || "en-US";

    return dateTime.toLocaleString(options, { locale });
  }, [dateString, options, timezone, language]);
}
