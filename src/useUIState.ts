import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";

export const useUIState = create(
  combine(
    {
      openCards: [] as string[],
      selectedBlock: [] as string[],
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
      setSelectedBlock: (block: string) =>
        set((state) => {
          return { ...state, selectedBlock: [block] };
        }),
      addBlockToSelection: (block: string) =>
        set((state) => {
          if (state.selectedBlock.includes(block)) return state;
          return { ...state, selectedBlock: [...state.selectedBlock, block] };
        }),
      removeBlockFromSelection: (block: string) =>
        set((state) => {
          return {
            ...state,
            selectedBlock: state.selectedBlock.filter((f) => f !== block),
          };
        }),
    }),
  ),
);
