import React from "react";
import { Separator } from "components/Layout";

export function MetaRow({
  author,
  date,
  interactions,
  textClassName,
  layout = "auto",
}: {
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
  textClassName: string;
  // "auto" (the default) picks compact vs. row from the container width; pass
  // "compact" or "row" to force a layout regardless of width.
  layout?: "row" | "compact" | "auto";
}) {
  let hasAuthor = author !== undefined && author !== null;
  let hasDate = date !== undefined && date !== null;
  const authorDate = (
    <div
      className={`authorDate text-tertiary flex gap-3 items-center shrink-0 min-w-0`}
    >
      {hasAuthor && <div className="truncate min-w-0">{author}</div>}
      {hasDate && (
        <>
          <Separator classname="h-3!" />
          <span className="whitespace-nowrap shrink-0">{date}</span>
        </>
      )}
    </div>
  );

  let compactMetaRow = (
    <div
      className={`compactMetaRow flex flex-col gap-2 w-full  text-tertiary ${textClassName}`}
    >
      {authorDate}
      {interactions}
    </div>
  );

  let metaRow = (
    <div
      className={`metaRow flex sm:flex-row flex-col sm:gap-3 gap-2 w-full sm:items-center text-tertiary ${textClassName}`}
    >
      {authorDate}

      {interactions && (
        <>
          <Separator classname="h-3! sm:block hidden" />
          {interactions}
        </>
      )}
    </div>
  );

  if (layout === "compact") {
    return compactMetaRow;
  }

  if (layout === "row") {
    return metaRow;
  }

  return (
    <div className={`@container/metarow w-full`}>
      <div className="@[320px]/metarow:hidden block">{compactMetaRow}</div>
      <div className="@[320px]/metarow:block hidden">{metaRow}</div>
    </div>
  );
}
