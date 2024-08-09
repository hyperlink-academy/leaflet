import { Block } from "components/Blocks";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";

type SelectedBlock = Pick<Block, "value" | "parent">;
export const useUIState = create(
  combine(
    {
      lastUsedHighlight: "1" as "1" | "2" | "3",
      focusedBlock: null as
        | { type: "card"; entityID: string }
        | { type: "block"; entityID: string; parent: string }
        | null,
      foldedBlocks: [] as string[],
      openCards: [] as string[],
      selectedBlock: [] as SelectedBlock[],
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
      openCard: (parent: string, card: string) =>
        set((state) => {
          let parentPosition = state.openCards.findIndex((s) => s == parent);
          return {
            openCards:
              parentPosition === -1
                ? [card]
                : [...state.openCards.slice(0, parentPosition + 1), card],
          };
        }),
      closeCard: (cards: string | string[]) =>
        set((s) => ({
          openCards: s.openCards.filter((c) => ![cards].flat().includes(c)),
        })),
      setFocusedBlock: (
        b:
          | { type: "card"; entityID: string }
          | { type: "block"; entityID: string; parent: string }
          | null,
      ) => set(() => ({ focusedBlock: b })),
      setSelectedBlock: (block: SelectedBlock) =>
        set((state) => {
          return { ...state, selectedBlock: [block] };
        }),
      setSelectedBlocks: (blocks: SelectedBlock[]) =>
        set((state) => {
          return { ...state, selectedBlock: blocks };
        }),
      addBlockToSelection: (block: SelectedBlock) =>
        set((state) => {
          if (state.selectedBlock.find((b) => b.value === block.value))
            return state;
          return { ...state, selectedBlock: [...state.selectedBlock, block] };
        }),
      removeBlockFromSelection: (block: { value: string }) =>
        set((state) => {
          return {
            ...state,
            selectedBlock: state.selectedBlock.filter(
              (f) => f.value !== block.value,
            ),
          };
        }),
    }),
  ),
);
