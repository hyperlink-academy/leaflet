import { Block } from "components/Blocks/Block";
import { create } from "zustand";
import { combine } from "zustand/middleware";

type SelectedBlock = Pick<Block, "value" | "parent">;
export const useUIState = create(
  combine(
    {
      lastUsedHighlight: "1" as "1" | "2" | "3",
      focusedEntity: null as
        | { entityType: "page"; entityID: string }
        | { entityType: "block"; entityID: string; parent: string }
        | null,
      foldedBlocks: [] as string[],
      openPages: [] as string[],
      selectedBlocks: [] as SelectedBlock[],
    },
    (set) => ({
      toggleFold: (entityID: string) => {
        set((state) => {
          return {
            foldedBlocks: state.foldedBlocks.includes(entityID)
              ? state.foldedBlocks.filter((b) => b !== entityID)
              : [...state.foldedBlocks, entityID],
          };
        });
      },
      openPage: (parent: string, page: string) =>
        set((state) => {
          let parentPosition = state.openPages.findIndex((s) => s == parent);
          return {
            openPages:
              parentPosition === -1
                ? [page]
                : [...state.openPages.slice(0, parentPosition + 1), page],
          };
        }),
      closePage: (pages: string | string[]) =>
        set((s) => ({
          openPages: s.openPages.filter((c) => ![pages].flat().includes(c)),
        })),
      setFocusedBlock: (
        b:
          | { entityType: "page"; entityID: string }
          | { entityType: "block"; entityID: string; parent: string }
          | null,
      ) => set(() => ({ focusedEntity: b })),
      setSelectedBlock: (block: SelectedBlock) =>
        set((state) => {
          return { ...state, selectedBlocks: [block] };
        }),
      setSelectedBlocks: (blocks: SelectedBlock[]) =>
        set((state) => {
          return { ...state, selectedBlocks: blocks };
        }),
      addBlockToSelection: (block: SelectedBlock) =>
        set((state) => {
          if (state.selectedBlocks.find((b) => b.value === block.value))
            return state;
          return { ...state, selectedBlocks: [...state.selectedBlocks, block] };
        }),
      removeBlockFromSelection: (block: { value: string }) =>
        set((state) => {
          return {
            ...state,
            selectedBlocks: state.selectedBlocks.filter(
              (f) => f.value !== block.value,
            ),
          };
        }),
    }),
  ),
);
