"use client";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";

export function LocalizedDate(props: {
  dateString: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const formattedDate = useLocalizedDate(props.dateString, props.options);
  return <>{formattedDate}</>;
}
