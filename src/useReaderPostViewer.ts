import { create } from "zustand";
import type { Post } from "actions/reader/getReaderFeed";

// Opening a post from a reader feed shows it in a full-page iframe instead of
// navigating away. The store snapshots the feed's order at open time so the
// toolbar's Next button can step through what the reader was looking at, even
// if the feed revalidates underneath.
//
// preloadUrl warms the viewer's iframe while the reader hovers or touches a
// listing: PostViewer keeps its (hidden) frame mounted for this url, and
// because opening the same url reuses the same iframe element, the post is
// already loading — or loaded — when the viewer reveals it. Clearing is
// url-conditional so a stale leave/touch-up can't cancel a newer hover, and
// clearing after the viewer opened is harmless (the open post owns the frame).
export const useReaderPostViewer = create<{
  queue: Post[];
  index: number | null;
  preloadUrl: string | null;
  // The viewer's in-box discussion panel; lives here (not in PostViewer
  // state) so a feed card's discussion button can open the viewer with the
  // panel already showing.
  discussionOpen: boolean;
  openViewer: (
    posts: Post[],
    uri: string,
    opts?: { discussion?: boolean },
  ) => void;
  nextPost: () => void;
  closeViewer: () => void;
  setDiscussionOpen: (open: boolean) => void;
  setPreloadUrl: (url: string) => void;
  clearPreloadUrl: (url: string) => void;
}>((set) => ({
  queue: [],
  index: null,
  preloadUrl: null,
  discussionOpen: false,
  openViewer: (posts, uri, opts) => {
    const queue = posts.filter((p) => p.documents.data);
    const index = queue.findIndex((p) => p.documents.uri === uri);
    if (index === -1) return;
    set({ queue, index, discussionOpen: !!opts?.discussion });
  },
  nextPost: () =>
    set((s) =>
      s.index === null || s.index >= s.queue.length - 1
        ? s
        : { index: s.index + 1, discussionOpen: false },
    ),
  closeViewer: () =>
    set({ queue: [], index: null, preloadUrl: null, discussionOpen: false }),
  setDiscussionOpen: (open) => set({ discussionOpen: open }),
  setPreloadUrl: (url) => set({ preloadUrl: url }),
  clearPreloadUrl: (url) =>
    set((s) => (s.preloadUrl === url ? { preloadUrl: null } : s)),
}));
