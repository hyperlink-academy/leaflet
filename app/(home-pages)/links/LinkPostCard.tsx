"use client";

import Link from "next/link";
import { DateTime } from "luxon";

interface LinkPostCardProps {
  post: {
    uri: string;
    title?: string | null;
    description?: string | null;
    link_count: number;
    author_did: string;
    created_at: string;
    record: {
      links?: Array<{
        url: string;
        title?: string;
        description?: string;
        tags?: string[];
      }>;
      tags?: string[];
      via?: {
        type?: string;
        uris?: string[];
      };
    };
    bsky_profiles?: {
      did: string;
      handle: string | null;
      record: any;
    } | null;
  };
}

export function LinkPostCard({ post }: LinkPostCardProps) {
  const createdAt = DateTime.fromISO(post.created_at);
  const relativeTime = createdAt.toRelative();
  const profile = post.bsky_profiles;
  const displayName = profile?.record?.displayName || profile?.handle || post.author_did.slice(0, 20);
  const links = post.record?.links || [];
  const tags = post.record?.tags || [];

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden hover:border-border-light transition-colors">
      {/* Post header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <Link
            href={`/links/user/${post.author_did}`}
            className="text-secondary hover:text-primary transition-colors flex items-center gap-2"
          >
            {profile?.record?.avatar && (
              <img
                src={`https://cdn.bsky.app/img/avatar/plain/${post.author_did}/${profile.record.avatar.ref.$link}@jpeg`}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="font-medium">@{displayName}</span>
          </Link>
          <span className="text-tertiary text-sm">{relativeTime}</span>
        </div>

        {/* Post title */}
        {post.title && (
          <h3 className="font-semibold text-lg mt-2">{post.title}</h3>
        )}

        {/* Post description */}
        {post.description && (
          <p className="text-secondary mt-1">{post.description}</p>
        )}

        {/* Post-level tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/links?tag=${encodeURIComponent(tag)}`}
                className="px-2 py-0.5 text-xs bg-bg-page rounded-full text-secondary hover:text-primary hover:bg-accent-1/10 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Link count badge */}
        <div className="mt-2 text-sm text-tertiary">
          {post.link_count} {post.link_count === 1 ? "link" : "links"}
        </div>
      </div>

      {/* Links list */}
      <div className="divide-y divide-border">
        {links.map((link, index) => (
          <LinkItemComponent key={index} link={link} />
        ))}
      </div>

      {/* Via indicator */}
      {post.record?.via?.type && (
        <div className="p-3 bg-bg-page text-xs text-tertiary border-t border-border">
          {post.record.via.type === "bsky-posts"
            ? `Aggregated from ${post.record.via.uris?.length || 0} Bluesky posts`
            : "Shared via Bluesky"}
        </div>
      )}
    </div>
  );
}

function LinkItemComponent({ link }: { link: { url: string; title?: string; description?: string; tags?: string[] } }) {
  const hostname = getHostname(link.url);

  return (
    <div className="p-4 hover:bg-bg-page/50 transition-colors">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="font-medium text-primary group-hover:text-accent-1 transition-colors">
          {link.title || link.url}
        </div>
        <div className="text-sm text-tertiary mt-0.5">
          {hostname}
        </div>
      </a>

      {link.description && (
        <p className="text-secondary text-sm mt-2 line-clamp-2">
          {link.description}
        </p>
      )}

      {link.tags && link.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {link.tags.map((tag) => (
            <Link
              key={tag}
              href={`/links?tag=${encodeURIComponent(tag)}`}
              className="px-1.5 py-0.5 text-xs bg-bg-page rounded text-tertiary hover:text-secondary transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
