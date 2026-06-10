"use client";
import { Fragment } from "react";
import { ProfilePopover } from "./ProfilePopover";
import {
  type BylineProfile,
  bylineName,
  bylineSeparator,
  namedBylineProfiles,
} from "src/utils/byline";

/**
 * Renders a post byline: each contributor's display name (or handle) linked to
 * its ProfilePopover, joined with the shared byline separator. Mirrors the post
 * header byline so listings present authors the same way.
 *
 * Contributors that only resolve to a bare DID (no displayName/handle) are
 * dropped so we don't render empty clickable spans; when nothing presentable
 * remains this renders `null`. `relative` lifts the popover triggers above any
 * card-covering link so they stay clickable.
 */
export function PostByline({
  contributors,
  className,
}: {
  contributors: BylineProfile[] | undefined;
  className?: string;
}) {
  let named = namedBylineProfiles(contributors);
  if (named.length === 0) return null;
  return (
    <span
      className={`postByline relative inline-flex flex-row flex-wrap items-center ${className ?? ""}`}
    >
      {named.map((c, i) => (
        <Fragment key={c.did}>
          {i > 0 && (
            <span className="whitespace-pre">
              {bylineSeparator(i, named.length)}
            </span>
          )}
          <ProfilePopover
            didOrHandle={c.did}
            trigger={<span className="hover:underline">{bylineName(c)}</span>}
          />
        </Fragment>
      ))}
    </span>
  );
}
