import { create } from "zustand";
import { combine } from "zustand/middleware";
import { useUIState } from "src/useUIState";
import { INK_COLORS, INK_SIZES } from "./ink";

export type InkTool = "pen" | "eraser";

// While a page is in draw mode, every stroke joins `target`, one drawing
// block; the first stroke of a fresh session creates it.
export const useInkSession = create(
  combine(
    {
      page: null as string | null,
      target: null as string | null,
      tool: "pen" as InkTool,
      color: INK_COLORS[0].value,
      size: INK_SIZES[1] as number,
      // Strokes an eraser gesture has swept, hidden until it lifts and they
      // are retracted together.
      erasing: [] as string[],
    },
    (set) => ({
      start: (page: string, target: string | null = null) => {
        useUIState.setState({ selectedBlocks: [], focusedEntity: null });
        (document.activeElement as HTMLElement | null)?.blur?.();
        set({ page, target, tool: "pen", erasing: [] });
      },
      setTarget: (target: string) => set({ target }),
      setTool: (tool: InkTool) => set({ tool }),
      setColor: (color: string) => set({ color, tool: "pen" }),
      setSize: (size: number) => set({ size, tool: "pen" }),
      setErasing: (erasing: string[]) => set({ erasing }),
    }),
  ),
);
