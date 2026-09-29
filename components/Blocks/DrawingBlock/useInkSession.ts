import { create } from "zustand";
import { combine } from "zustand/middleware";
import { useUIState } from "src/useUIState";
import { INK_COLORS, INK_SIZES } from "./ink";

type InkTool = "pen" | "eraser" | "fill";

// A color pick keeps the fill tool, and otherwise goes back to the pen.
const inking = (tool: InkTool): InkTool => (tool === "fill" ? "fill" : "pen");

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
      // The color picker's last pick, kept while a built-in color is in use.
      customColor: "#0090FF",
      colorPickerOpen: false,
      // Strokes an eraser gesture has swept, hidden until it lifts and they
      // are retracted together.
      erasing: [] as string[],
    },
    (set) => ({
      start: (page: string, target: string | null = null) => {
        useUIState.setState({ selectedBlocks: [], focusedEntity: null });
        (document.activeElement as HTMLElement | null)?.blur?.();
        set({
          page,
          target,
          tool: "pen",
          erasing: [],
          colorPickerOpen: false,
        });
      },
      setTool: (tool: InkTool) => set({ tool }),
      setColor: (color: string) =>
        set((s) => ({ color, tool: inking(s.tool) })),
      setCustomColor: (customColor: string) =>
        set((s) => ({
          customColor,
          color: customColor,
          tool: inking(s.tool),
        })),
      setSize: (size: number) => set({ size, tool: "pen" }),
      setColorPickerOpen: (colorPickerOpen: boolean) =>
        set({ colorPickerOpen }),
    }),
  ),
);
