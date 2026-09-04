import React from "react";
import { SpeedyLink } from "components/SpeedyLink";

// The visible title sits outside this full-card overlay anchor, so it carries
// a visually-hidden copy as its accessible name / anchor text.
export function PostLink({
  href,
  title,
  onClick,
}: {
  href?: string;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  if (href) {
    return (
      <SpeedyLink
        href={href}
        onClick={onClick}
        className="publishedPostLink absolute inset-0 z-[1]"
      >
        {title && <span className="sr-only">{title}</span>}
      </SpeedyLink>
    );
  }
  return <div className="publishedPostLink absolute inset-0" />;
}
