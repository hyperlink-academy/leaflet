import React from "react";
import { SpeedyLink } from "components/SpeedyLink";

<<<<<<< HEAD
export function PostLink({
  href,
  onClick,
}: {
  href?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
=======
// The visible title sits outside this full-card overlay anchor, so it carries
// a visually-hidden copy as its accessible name / anchor text.
export function PostLink({ href, title }: { href?: string; title?: string }) {
>>>>>>> 0cabef6f8e75638c77970d21a45455350be367a4
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
