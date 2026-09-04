import { create } from "zustand";
import type { Post } from "actions/reader/getReaderFeed";

export const useReaderPostViewer = create<{
  queue: Post[];
  index: number | null;
  preloadUrl: string | null;
  discussionOpen: boolean;
  openViewer: (
    posts: Post[],
    uri: string,
    opts?: { discussion?: boolean },
  ) => void;
  nextPost: () => void;
  prevPost: () => void;
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
  prevPost: () =>
    set((s) =>
      s.index === null || s.index <= 0
        ? s
        : { index: s.index - 1, discussionOpen: false },
    ),
  closeViewer: () =>
    set({ queue: [], index: null, preloadUrl: null, discussionOpen: false }),
  setDiscussionOpen: (open) => set({ discussionOpen: open }),
  setPreloadUrl: (url) => set({ preloadUrl: url }),
  clearPreloadUrl: (url) =>
    set((s) => (s.preloadUrl === url ? { preloadUrl: null } : s)),
}));
