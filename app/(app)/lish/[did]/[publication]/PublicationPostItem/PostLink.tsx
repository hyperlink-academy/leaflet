import React from "react";
import { SpeedyLink } from "components/SpeedyLink";

export function PostLink({ href }: { href?: string }) {
  if (href) {
    return (
      <SpeedyLink href={href} className="publishedPostLink absolute inset-0" />
    );
  }
  return <div className="publishedPostLink absolute inset-0" />;
}
