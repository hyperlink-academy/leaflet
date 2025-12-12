"use client";

import { useState, useEffect } from "react";
import { getMyBskyPostsWithLinks, aggregateBskyLinksToPost } from "actions/linkActions";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DateTime } from "luxon";

interface BskyPost {
  uri: string;
  text: string;
  createdAt: string;
  links: {
    url: string;
    title?: string;
    description?: string;
  }[];
}

export function BskyImportForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [posts, setPosts] = useState<BskyPost[]>([]);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (isOpen && posts.length === 0) {
      loadPosts();
    }
  }, [isOpen]);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyBskyPostsWithLinks(50);
      setPosts(result);
    } catch (err: any) {
      setError(err.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const togglePost = (uri: string) => {
    const newSelected = new Set(selectedUris);
    if (newSelected.has(uri)) {
      newSelected.delete(uri);
    } else {
      newSelected.add(uri);
    }
    setSelectedUris(newSelected);
  };

  const selectAll = () => {
    setSelectedUris(new Set(posts.map((p) => p.uri)));
  };

  const selectNone = () => {
    setSelectedUris(new Set());
  };

  const handleImport = async () => {
    if (selectedUris.size === 0) return;

    setImporting(true);
    setError(null);

    try {
      const tagArray = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      await aggregateBskyLinksToPost(
        Array.from(selectedUris),
        title || undefined,
        description || undefined,
        tagArray.length > 0 ? tagArray : undefined,
      );

      // Reset and close
      setIsOpen(false);
      setPosts([]);
      setSelectedUris(new Set());
      setTitle("");
      setDescription("");
      setTags("");

      // Refresh page
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to import posts");
    } finally {
      setImporting(false);
    }
  };

  const selectedLinkCount = posts
    .filter((p) => selectedUris.has(p.uri))
    .reduce((sum, p) => sum + p.links.length, 0);

  if (!isOpen) {
    return (
      <ButtonSecondary onClick={() => setIsOpen(true)}>
        Import from Bluesky
      </ButtonSecondary>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Import Links from Bluesky</h2>
          <p className="text-secondary text-sm mb-4">
            Select posts with links to bundle into a link post.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Post-level metadata */}
          <div className="space-y-3 mb-4 pb-4 border-b border-border">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title (optional)"
              maxLength={100}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Introduction (optional)"
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent resize-none"
            />
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent"
            />
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-secondary">
              {selectedUris.size} posts selected ({selectedLinkCount} links)
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-accent-1 hover:underline"
              >
                Select all
              </button>
              <button
                onClick={selectNone}
                className="text-sm text-accent-1 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Posts list */}
          <div className="space-y-2 max-h-[40vh] overflow-auto mb-4">
            {loading ? (
              <div className="text-center text-secondary py-8">Loading your posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center text-secondary py-8">
                No posts with links found
              </div>
            ) : (
              posts.map((post) => (
                <BskyPostItem
                  key={post.uri}
                  post={post}
                  selected={selectedUris.has(post.uri)}
                  onToggle={() => togglePost(post.uri)}
                />
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <ButtonSecondary
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </ButtonSecondary>
            <ButtonPrimary
              onClick={handleImport}
              disabled={importing || selectedUris.size === 0}
              className="flex-1"
            >
              {importing
                ? "Importing..."
                : `Import ${selectedLinkCount} Link${selectedLinkCount !== 1 ? "s" : ""}`}
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

function BskyPostItem({
  post,
  selected,
  onToggle,
}: {
  post: BskyPost;
  selected: boolean;
  onToggle: () => void;
}) {
  const createdAt = DateTime.fromISO(post.createdAt);
  const relativeTime = createdAt.toRelative();

  return (
    <div
      onClick={onToggle}
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        selected
          ? "border-accent-1 bg-accent-1/5"
          : "border-border hover:border-border-light"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm line-clamp-2">{post.text}</p>
          <div className="text-xs text-tertiary mt-1">{relativeTime}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {post.links.map((link, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-bg-page rounded text-secondary truncate max-w-[200px]"
                title={link.url}
              >
                {getHostname(link.url)}
              </span>
            ))}
          </div>
        </div>
      </div>
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
