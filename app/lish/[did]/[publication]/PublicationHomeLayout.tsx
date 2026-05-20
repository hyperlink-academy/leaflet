"use client";

import { usePreserveScroll } from "src/hooks/usePreserveScroll";

export function PublicationHomeLayout(props: {
  uri: string;
  showPageBackground: boolean;
  stickyHeader?: React.ReactNode;
  children: React.ReactNode;
}) {
  let { ref } = usePreserveScroll<HTMLDivElement>(props.uri);
  let inner = (
    <>
      {props.stickyHeader}
      <div className="pubContent sm:max-w-(--page-width-units) sm:min-w-(--page-width-units) w-full mx-auto px-3 sm:px-4 pb-5">
        {props.children}
      </div>
    </>
  );
  if (props.showPageBackground) {
    return (
      <div className="pubWrapper flex flex-col sm:py-6 h-full max-w-(--page-width-units) mx-auto px-0 py-2">
        <div
          ref={ref}
          className="pubContentScroll publicationScrollContainer overflow-auto h-full bg-[rgba(var(--bg-page),var(--bg-page-alpha))] border border-border rounded-lg flex flex-col"
        >
          {inner}
        </div>
      </div>
    );
  }
  return (
    <div
      ref={ref}
      className="pubWrapper publicationScrollContainer flex flex-col sm:pb-6 h-full w-full overflow-y-scroll"
    >
      {inner}
    </div>
  );
}
