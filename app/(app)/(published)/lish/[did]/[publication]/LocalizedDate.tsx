"use client";
import {
  useLocalizedDate,
  useLocalizedDateParts,
} from "src/hooks/useLocalizedDate";

export function LocalizedDate(props: {
  dateString: string;
  options?: Intl.DateTimeFormatOptions;
  // Drops the year for dates in the current year — post lists show "Jun 5" for
  // this year and "Jun 5 '24" for anything older.
  omitYear?: boolean;
}) {
  const isCurrentYear =
    new Date(props.dateString).getFullYear() === new Date().getFullYear();
  const options =
    props.omitYear && isCurrentYear
      ? { ...props.options, year: undefined }
      : props.options;

  const formattedDate = useLocalizedDate(props.dateString, options);
  const parts = useLocalizedDateParts(props.dateString, options);

  // A 2-digit year reads as an abbreviation — "Jun 5 '24", apostrophe and no
  // comma. Rewriting the Intl parts rather than the formatted string keeps
  // that right in locales that lead with the year.
  if (options?.year !== "2-digit") return <>{formattedDate}</>;
  return (
    <>
      {parts
        .map((part, i) => {
          if (part.type === "year") return `'${part.value}`;
          if (part.type === "literal" && parts[i + 1]?.type === "year")
            return part.value.replace(/,/g, "");
          return part.value;
        })
        .join("")}
    </>
  );
}
