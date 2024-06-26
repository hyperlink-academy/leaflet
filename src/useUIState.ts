import { Block } from "components/Blocks";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";

export const useUIState = create(
  combine(
    {
      focusedBlock: null as
        | { type: "card"; entityID: string }
        | { type: "block"; entityID: string; parent: string }
        | null,
      openCards: [] as string[],
      selectedBlock: [] as Block[],
    },
    (set) => ({
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
      closeCard: (card: string) =>
        set((s) => ({ openCards: s.openCards.filter((c) => c !== card) })),
      setSelectedBlock: (block: Block) =>
        set((state) => {
          return { ...state, selectedBlock: [block] };
        }),
      setSelectedBlocks: (blocks: Block[]) =>
        set((state) => {
          return { ...state, selectedBlock: blocks };
        }),
      addBlockToSelection: (block: Block) =>
        set((state) => {
          if (state.selectedBlock.find((b) => b.value === block.value))
            return state;
          return { ...state, selectedBlock: [...state.selectedBlock, block] };
        }),
      removeBlockFromSelection: (block: Block) =>
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
