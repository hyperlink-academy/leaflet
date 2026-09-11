import React from "react";

export function MetaRow({
  author,
  date,
  interactions,
  textClassName,
  compact,
}: {
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
  textClassName?: string;
  compact?: boolean;
}) {
  let hasAuthor = author !== undefined && author !== null;
  let hasDate = date !== undefined && date !== null;

  return (
    <div
      className={`metaRow text-sm flex sm:flex-row flex-col sm:gap-2 gap-1 sm:items-center w-full text-tertiary z-10 ${textClassName} ${compact && "sm:gap-1! sm:flex-col! sm:items-start"}`}
    >
      <div
        className={`authorDate text-tertiary flex gap-2 items-center  min-w-0`}
      >
        {hasAuthor && <div className="truncate min-w-0">{author}</div>}
        {hasDate && (
          <>
            {hasAuthor && (
              <span className="shrink-0" aria-hidden>
                ·
              </span>
            )}
            <span className="whitespace-nowrap shrink-0">{date}</span>
          </>
        )}
      </div>
      {interactions && (
        <>
          <span
            className={`shrink-0 sm:block hidden ${compact && "sm:hidden"}`}
            aria-hidden
          >
            ·
          </span>
          <div className="shrink-0">{interactions}</div>
        </>
      )}
    </div>
  );
}
