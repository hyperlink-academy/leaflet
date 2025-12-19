import { create } from "zustand";
import { combine } from "zustand/middleware";

export const useThreadState = create(
  combine(
    {
      // Set of collapsed thread URIs
      collapsedThreads: new Set<string>(),
    },
    (set) => ({
      toggleCollapsed: (uri: string) => {
        set((state) => {
          const newCollapsed = new Set(state.collapsedThreads);
          if (newCollapsed.has(uri)) {
            newCollapsed.delete(uri);
          } else {
            newCollapsed.add(uri);
          }
          return { collapsedThreads: newCollapsed };
        });
      },
      isCollapsed: (uri: string) => {
        // This is a selector helper, but we'll use the state directly
        return false;
      },
    }),
  ),
);
