"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getAllLinkPosts,
  getFollowedLinkPosts,
  getRandomLinks,
  getLinkPostsByTag,
} from "actions/linkActions";
import { LinkPostCard } from "./LinkPostCard";
import { ButtonPrimary } from "components/Buttons";

type FeedType = "all" | "following" | "discover" | "tag";

interface LinksFeedProps {
  initialFeed: string;
  initialTag?: string;
  isLoggedIn: boolean;
}

export function LinksFeed({ initialFeed, initialTag, isLoggedIn }: LinksFeedProps) {
  const [feed, setFeed] = useState<FeedType>(
    initialFeed === "following" && isLoggedIn ? "following" :
    initialFeed === "discover" ? "discover" :
    initialTag ? "tag" : "all"
  );
  const [tag, setTag] = useState(initialTag || "");
  const [posts, setPosts] = useState<any[]>([]);
  const [randomLinks, setRandomLinks] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const cursorToUse = reset ? undefined : cursor;

      if (feed === "discover") {
        // Discover mode returns individual links, not posts
        const result = await getRandomLinks(20, tag || undefined);
        setRandomLinks(result.links);
        setHasMore(false);
      } else {
        let result;
        switch (feed) {
          case "following":
            result = await getFollowedLinkPosts(20, cursorToUse);
            break;
          case "tag":
            result = await getLinkPostsByTag(tag, 20, cursorToUse);
            break;
          default:
            result = await getAllLinkPosts(20, cursorToUse);
        }

        if (reset) {
          setPosts(result.posts);
        } else {
          setPosts(prev => [...prev, ...result.posts]);
        }

        setCursor(result.cursor);
        setHasMore(!!result.cursor);
      }
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  }, [feed, tag, cursor]);

  useEffect(() => {
    fetchPosts(true);
  }, [feed, tag]);

  const handleFeedChange = (newFeed: FeedType) => {
    setFeed(newFeed);
    setCursor(undefined);
    setHasMore(true);
    setPosts([]);
    setRandomLinks([]);
  };

  const handleShuffle = () => {
    setCursor(undefined);
    fetchPosts(true);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Feed selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        <FeedTab
          active={feed === "all"}
          onClick={() => handleFeedChange("all")}
        >
          All Posts
        </FeedTab>
        {isLoggedIn && (
          <FeedTab
            active={feed === "following"}
            onClick={() => handleFeedChange("following")}
          >
            Following
          </FeedTab>
        )}
        <FeedTab
          active={feed === "discover"}
          onClick={() => handleFeedChange("discover")}
        >
          Discover
        </FeedTab>
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 items-center justify-center">
        <input
          type="text"
          placeholder="Filter by tag..."
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            if (e.target.value) {
              setFeed("tag");
            }
          }}
          className="px-3 py-1 border rounded-md text-sm"
        />
        {tag && (
          <button
            onClick={() => {
              setTag("");
              handleFeedChange("all");
            }}
            className="text-secondary hover:text-primary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Shuffle button for discover mode */}
      {feed === "discover" && (
        <div className="flex justify-center">
          <ButtonPrimary onClick={handleShuffle}>
            Shuffle Links
          </ButtonPrimary>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-4">
        {feed === "discover" ? (
          // Discover mode shows individual links
          randomLinks.map((link) => (
            <RandomLinkCard key={link.id} link={link} />
          ))
        ) : (
          // Normal modes show link posts
          posts.map((post) => (
            <LinkPostCard key={post.uri} post={post} />
          ))
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center text-secondary py-4">Loading...</div>
      )}

      {/* Empty state */}
      {!loading && (feed === "discover" ? randomLinks.length === 0 : posts.length === 0) && (
        <div className="text-center text-secondary py-8">
          <p>No links found</p>
          {feed === "following" && (
            <p className="text-sm mt-2">Follow some users to see their links here!</p>
          )}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && posts.length > 0 && feed !== "discover" && (
        <div className="flex justify-center py-4">
          <ButtonPrimary onClick={() => fetchPosts(false)}>
            Load More
          </ButtonPrimary>
        </div>
      )}
    </div>
  );
}

function RandomLinkCard({ link }: { link: any }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 hover:border-border-light transition-colors">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <h3 className="font-semibold text-primary group-hover:text-accent-1 transition-colors line-clamp-2">
          {link.title || link.url}
        </h3>
        <div className="text-sm text-tertiary mt-1 truncate">
          {getHostname(link.url)}
        </div>
      </a>
      {link.description && (
        <p className="mt-2 text-secondary text-sm line-clamp-2">
          {link.description}
        </p>
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

function FeedTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-accent-1 text-accent-2"
          : "bg-bg-card text-secondary hover:bg-bg-page"
      }`}
    >
      {children}
    </button>
  );
}
