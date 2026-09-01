import type { Block } from "components/Blocks/Block";
import { create } from "zustand";
import { combine } from "zustand/middleware";

type SelectedBlock = Pick<Block, "entityID" | "parent">;

export type FocusedEntity =
  | { entityType: "page"; entityID: string }
  | { entityType: "block"; entityID: string; parent: string }
  | { entityType: "footnote"; entityID: string; parent: string }
  | { entityType: "comment"; entityID: string; parent: string }
  | null;

export type EditorIframePage = { type: "iframe"; url: string };
export type EditorOpenPage = string | EditorIframePage;

export const getEditorPageKey = (page: EditorOpenPage): string =>
  typeof page === "string" ? page : `iframe:${page.url}`;

export const useUIState = create(
  combine(
    {
      lastUsedHighlight: "1" as "1" | "2" | "3",
      focusedEntity: null as FocusedEntity,
      foldedBlocks: [] as string[],
      // page entity -> list-item entity the page is zoomed into; when set, the
      // page renders that block as its root instead of the full document.
      zoomedBlocks: {} as { [pageEntity: string]: string },
      openPages: [] as EditorOpenPage[],
      selectedBlocks: [] as SelectedBlock[],
      openPopover: null as string | null,
    },
    (set) => ({
      setOpenPopover: (id: string | null) => {
        set({ openPopover: id });
      },
      openPage: (parent: EditorOpenPage, page: EditorOpenPage) =>
        set((state) => {
          let parentKey = getEditorPageKey(parent);
          let parentPosition = state.openPages.findIndex(
            (s) => getEditorPageKey(s) === parentKey,
          );
          return {
            openPages:
              parentPosition === -1
                ? [page]
                : [...state.openPages.slice(0, parentPosition + 1), page],
          };
        }),
      closePage: (pages: EditorOpenPage | EditorOpenPage[]) =>
        set((s) => {
          let keys = [pages].flat().map(getEditorPageKey);
          return {
            openPages: s.openPages.filter(
              (c) => !keys.includes(getEditorPageKey(c)),
            ),
          };
        }),
      setFocusedBlock: (b: FocusedEntity) => set(() => ({ focusedEntity: b })),
      // `parent` is whatever list the block was rendered in — the page itself,
      // or the current zoom root when zooming deeper — so resolve it back to
      // the page entity that keys the zoom.
      zoomIntoBlock: (parent: string, blockEntity: string) =>
        set((state) => {
          let page =
            Object.keys(state.zoomedBlocks).find(
              (p) => state.zoomedBlocks[p] === parent,
            ) ?? parent;
          return {
            zoomedBlocks: { ...state.zoomedBlocks, [page]: blockEntity },
            selectedBlocks: [],
            focusedEntity: { entityType: "page" as const, entityID: blockEntity },
          };
        }),
      zoomOutOfBlock: (page: string) =>
        set((state) => {
          let { [page]: _, ...zoomedBlocks } = state.zoomedBlocks;
          return {
            zoomedBlocks,
            selectedBlocks: [],
            focusedEntity: { entityType: "page" as const, entityID: page },
          };
        }),
      // Callers often pass full block-prop objects; store only {entityID, parent}
      // so selection entries stay slim and identity-stable. Re-selecting the
      // current selection bails without notifying subscribers.
      setSelectedBlock: (block: SelectedBlock) =>
        set((state) => {
          if (
            state.selectedBlocks.length === 1 &&
            state.selectedBlocks[0].entityID === block.entityID &&
            state.selectedBlocks[0].parent === block.parent
          )
            return state;
          return { selectedBlocks: [selectionEntry(block)] };
        }),
      setSelectedBlocks: (blocks: SelectedBlock[]) =>
        set(() => ({ selectedBlocks: blocks.map(selectionEntry) })),
      addBlockToSelection: (block: SelectedBlock) =>
        set((state) => {
          if (state.selectedBlocks.find((b) => b.entityID === block.entityID))
            return state;
          return {
            selectedBlocks: [...state.selectedBlocks, selectionEntry(block)],
          };
        }),
      removeBlockFromSelection: (block: { entityID: string }) =>
        set((state) => {
          return {
            selectedBlocks: state.selectedBlocks.filter(
              (f) => f.entityID !== block.entityID,
            ),
          };
        }),
      // Focus + select a single block in one store write, so the hot
      // focus-move path (arrow keys, clicks, enter) notifies subscribers once
      // instead of twice. Bails entirely if nothing changes.
      focusAndSelectBlock: (block: SelectedBlock) =>
        set((state) => {
          let sameSelection =
            state.selectedBlocks.length === 1 &&
            state.selectedBlocks[0].entityID === block.entityID &&
            state.selectedBlocks[0].parent === block.parent;
          let sameFocus =
            state.focusedEntity?.entityType === "block" &&
            state.focusedEntity.entityID === block.entityID &&
            state.focusedEntity.parent === block.parent;
          if (sameSelection && sameFocus) return state;
          return {
            selectedBlocks: sameSelection
              ? state.selectedBlocks
              : [selectionEntry(block)],
            focusedEntity: sameFocus
              ? state.focusedEntity
              : {
                  entityType: "block" as const,
                  entityID: block.entityID,
                  parent: block.parent,
                },
          };
        }),
    }),
  ),
);

const selectionEntry = (block: SelectedBlock): SelectedBlock => ({
  entityID: block.entityID,
  parent: block.parent,
});

export const useIsBlockSelected = (entityID: string) =>
  useUIState((s) => s.selectedBlocks.some((b) => b.entityID === entityID));

export const useIsPageFocused = (entityID: string) =>
  useUIState((s) =>
    s.focusedEntity?.entityType === "page"
      ? s.focusedEntity.entityID === entityID
      : s.focusedEntity?.parent === entityID,
  );

export const getZoomedBlockPage = (entity: string) =>
  Object.entries(useUIState.getState().zoomedBlocks).find(
    ([, zoomed]) => zoomed === entity,
  )?.[0];

export const isZoomedBlockRoot = (entity: string) =>
  getZoomedBlockPage(entity) !== undefined;
