"use client";

import { usePreserveScroll } from "src/hooks/usePreserveScroll";

export function PublicationHomeLayout(props: {
  uri: string;
  showPageBackground: boolean;
  children: React.ReactNode;
}) {
  let { ref } = usePreserveScroll<HTMLDivElement>(props.uri);
  return (
    <div
      ref={props.showPageBackground ? null : ref}
      className={`pubWrapper flex flex-col sm:py-6 h-full   ${props.showPageBackground ? "max-w-prose mx-auto sm:px-0 px-[6px] py-2" : "w-full overflow-y-scroll"}`}
    >
      <div
        ref={!props.showPageBackground ? null : ref}
        className={`pub sm:max-w-prose max-w-(--page-width-units) w-[1000px] mx-auto px-3 sm:px-4 py-5  ${props.showPageBackground ? "overflow-auto h-full bg-[rgba(var(--bg-page),var(--bg-page-alpha))] border border-border rounded-lg" : "h-fit"}`}
      >
        {props.children}
      </div>
    </div>
  );
}
