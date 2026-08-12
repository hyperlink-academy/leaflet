import React from "react";
import { SpeedyLink } from "components/SpeedyLink";

export function PostLink({
  href,
  onClick,
}: {
  href?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  if (href) {
    return (
      <SpeedyLink
        href={href}
        onClick={onClick}
        className="publishedPostLink absolute inset-0 z-[1]"
      />
    );
  }
  return <div className="publishedPostLink absolute inset-0" />;
}
