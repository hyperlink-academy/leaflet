"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PublicationStickyHeader(props: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  let ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="pubStickyHeader sticky top-0 z-10 bg-bg-page shrink-0"
    >
      <div className="sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4">
        {props.children}
      </div>
      {props.nav}
    </div>
  );
}
