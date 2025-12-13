"use client";

import { useState } from "react";
import { createLinkPost, LinkItem } from "actions/linkActions";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";

interface LinkEntry {
  url: string;
  title: string;
  description: string;
  tags: string;
}

const emptyLink: LinkEntry = { url: "", title: "", description: "", tags: "" };

export function LinkSubmitForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postTags, setPostTags] = useState("");
  const [links, setLinks] = useState<LinkEntry[]>([{ ...emptyLink }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLink = () => {
    if (links.length < 50) {
      setLinks([...links, { ...emptyLink }]);
    }
  };

  const removeLink = (index: number) => {
    if (links.length > 1) {
      setLinks(links.filter((_, i) => i !== index));
    }
  };

  const updateLink = (index: number, field: keyof LinkEntry, value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate all URLs
      const validLinks: LinkItem[] = [];
      for (const link of links) {
        if (!link.url.trim()) continue;
        try {
          new URL(link.url);
        } catch {
          throw new Error(`Invalid URL: ${link.url}`);
        }

        const linkTags = link.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0);

        validLinks.push({
          url: link.url,
          title: link.title || undefined,
          description: link.description || undefined,
          tags: linkTags.length > 0 ? linkTags : undefined,
        });
      }

      if (validLinks.length === 0) {
        throw new Error("At least one valid URL is required");
      }

      const postTagArray = postTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      await createLinkPost({
        title: postTitle || undefined,
        description: postDescription || undefined,
        links: validLinks,
        tags: postTagArray.length > 0 ? postTagArray : undefined,
      });

      // Reset form and close
      setPostTitle("");
      setPostDescription("");
      setPostTags("");
      setLinks([{ ...emptyLink }]);
      setIsOpen(false);

      // Trigger refresh
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to share links");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <ButtonPrimary onClick={() => setIsOpen(true)}>
        Share Links
      </ButtonPrimary>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-semibold mb-4">Share Links</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Post-level metadata */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Post Title (optional)
              </label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Weekly Finds, Cool Reads, etc."
                maxLength={100}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Introduction (optional)
              </label>
              <textarea
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                placeholder="Context for this batch of links..."
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Post Tags (optional)
              </label>
              <input
                type="text"
                value={postTags}
                onChange={(e) => setPostTags(e.target.value)}
                placeholder="weekly, roundup, design (comma separated)"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent"
              />
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Links</h3>
              <button
                type="button"
                onClick={addLink}
                disabled={links.length >= 50}
                className="text-sm text-accent-1 hover:underline disabled:opacity-50"
              >
                + Add Link
              </button>
            </div>

            {links.map((link, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-tertiary">Link {index + 1}</span>
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(index, "url", e.target.value)}
                  placeholder="https://example.com/article *"
                  required={index === 0}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent"
                />

                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => updateLink(index, "title", e.target.value)}
                  placeholder="Title (optional)"
                  maxLength={100}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent"
                />

                <textarea
                  value={link.description}
                  onChange={(e) => updateLink(index, "description", e.target.value)}
                  placeholder="Your thoughts on this link (optional)"
                  maxLength={300}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent resize-none"
                />

                <input
                  type="text"
                  value={link.tags}
                  onChange={(e) => updateLink(index, "tags", e.target.value)}
                  placeholder="Tags for this link (comma separated)"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-1 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <ButtonSecondary
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </ButtonSecondary>
            <ButtonPrimary
              type="submit"
              disabled={loading || !links[0]?.url}
              className="flex-1"
            >
              {loading ? "Sharing..." : `Share ${links.filter(l => l.url).length} Link${links.filter(l => l.url).length !== 1 ? "s" : ""}`}
            </ButtonPrimary>
          </div>
        </form>
      </div>
    </div>
  );
}
