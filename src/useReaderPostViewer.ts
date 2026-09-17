import { create } from "zustand";
import type { Post } from "actions/reader/getReaderFeed";

// What's showing over the post inside the viewer's box, if anything.
export type ReaderPanel =
  | { type: "discussion" }
  | { type: "recommends" }
  | { type: "tag"; tag: string };

export const useReaderPostViewer = create<{
  queue: Post[];
  index: number | null;
  preloadUrl: string | null;
  panel: ReaderPanel | null;
  openViewer: (
    posts: Post[],
    uri: string,
    opts?: { panel?: ReaderPanel },
  ) => void;
  nextPost: () => void;
  prevPost: () => void;
  closeViewer: () => void;
  setPanel: (panel: ReaderPanel | null) => void;
  setPreloadUrl: (url: string) => void;
  clearPreloadUrl: (url: string) => void;
}>((set) => ({
  queue: [],
  index: null,
  preloadUrl: null,
  panel: null,
  openViewer: (posts, uri, opts) => {
    const queue = posts.filter((p) => p.documents.data);
    const index = queue.findIndex((p) => p.documents.uri === uri);
    if (index === -1) return;
    set({ queue, index, panel: opts?.panel ?? null });
  },
  nextPost: () =>
    set((s) =>
      s.index === null || s.index >= s.queue.length - 1
        ? s
        : { index: s.index + 1, panel: null },
    ),
  prevPost: () =>
    set((s) =>
      s.index === null || s.index <= 0
        ? s
        : { index: s.index - 1, panel: null },
    ),
  closeViewer: () =>
    set({ queue: [], index: null, preloadUrl: null, panel: null }),
  setPanel: (panel) => set({ panel }),
  setPreloadUrl: (url) => set({ preloadUrl: url }),
  clearPreloadUrl: (url) =>
    set((s) => (s.preloadUrl === url ? { preloadUrl: null } : s)),
}));
