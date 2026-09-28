import { create } from "zustand";
import type { Post } from "actions/reader/getReaderFeed";
import type { OpenPage } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postPageState";
import type { DrawerThread } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";

// What's showing over the post inside the viewer's box, if anything.
// A discussion can be scoped to one of the post's subpages, and can open
// straight onto a thread from the post body.
export type ReaderPanel =
  | {
      type: "discussion";
      tab?: "comments" | "quotes";
      pageId?: string;
      thread?: DrawerThread;
    }
  | { type: "recommends" }
  | { type: "tag"; tag: string };

export const useReaderPostViewer = create<{
  queue: Post[];
  index: number | null;
  preloadUrl: string | null;
  panel: ReaderPanel | null;
  // Pages opened from within the current leaflet post, innermost last; the
  // viewer shows only the last one.
  pages: OpenPage[];
  setPages: (update: (pages: OpenPage[]) => OpenPage[]) => void;
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
  pages: [],
  setPages: (update) => set((s) => ({ pages: update(s.pages) })),
  openViewer: (posts, uri, opts) => {
    const queue = posts.filter((p) => p.documents.data);
    const index = queue.findIndex((p) => p.documents.uri === uri);
    if (index === -1) return;
    set({ queue, index, panel: opts?.panel ?? null, pages: [] });
  },
  nextPost: () =>
    set((s) =>
      s.index === null || s.index >= s.queue.length - 1
        ? s
        : { index: s.index + 1, panel: null, pages: [] },
    ),
  prevPost: () =>
    set((s) =>
      s.index === null || s.index <= 0
        ? s
        : { index: s.index - 1, panel: null, pages: [] },
    ),
  closeViewer: () =>
    set({ queue: [], index: null, preloadUrl: null, panel: null, pages: [] }),
  setPanel: (panel) => set({ panel }),
  setPreloadUrl: (url) => set({ preloadUrl: url }),
  clearPreloadUrl: (url) =>
    set((s) => (s.preloadUrl === url ? { preloadUrl: null } : s)),
}));
