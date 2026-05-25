import React from "react";

export function PublicationFullHeader(props: { children: React.ReactNode }) {
  return (
    <div className="pubFullHeader shrink-0">
      <div className="sm:max-w-(--page-width-units) w-full mx-auto px-3 sm:px-4 pt-5">
        {props.children}
      </div>
    </div>
  );
}
