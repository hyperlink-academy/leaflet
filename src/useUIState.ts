import { create } from "zustand";
import { combine } from "zustand/middleware";

export const useUIState = create(
  combine(
    {
      openCards: [] as string[],
      selectedBlock: [] as string[],
    },
    (set) => ({
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
