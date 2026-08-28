import { Block } from "components/Blocks/Block";
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

// Persistence for foldedBlocks is driven by the store's own fold actions
// (toggleFold/foldAll/unfoldAll) calling this registered persister with the
// delta they applied, rather than by observing store writes — so
// non-user-action writes (the route-change reset, the inbound fact sync) can
// set foldedBlocks freely without being mistaken for something to persist.
// CollapsedBlocksSync registers while mounted for a signed-in user with write
// rights; signed-out users stay ephemeral because nothing is registered.
export type FoldDelta = { collapse?: string[]; uncollapse?: string[] };
let foldPersister: ((delta: FoldDelta) => void) | null = null;
export const registerFoldPersister = (persist: (delta: FoldDelta) => void) => {
  foldPersister = persist;
  return () => {
    if (foldPersister === persist) foldPersister = null;
  };
};
export const hasFoldPersister = () => foldPersister !== null;

export const useUIState = create(
  combine(
    {
      lastUsedHighlight: "1" as "1" | "2" | "3",
      focusedEntity: null as FocusedEntity,
      foldedBlocks: [] as string[],
      openPages: [] as EditorOpenPage[],
      selectedBlocks: [] as SelectedBlock[],
      openPopover: null as string | null,
    },
    (set) => ({
      setOpenPopover: (id: string | null) => {
        set({ openPopover: id });
      },
      toggleFold: (entityID: string) => {
        let folded = false;
        set((state) => {
          folded = !state.foldedBlocks.includes(entityID);
          return {
            foldedBlocks: folded
              ? [...state.foldedBlocks, entityID]
              : state.foldedBlocks.filter((b) => b !== entityID),
          };
        });
        foldPersister?.(
          folded ? { collapse: [entityID] } : { uncollapse: [entityID] },
        );
      },
      foldAll: (entityIDs: string[]) => {
        let collapse: string[] = [];
        set((state) => {
          collapse = entityIDs.filter((e) => !state.foldedBlocks.includes(e));
          if (collapse.length === 0) return state;
          return { foldedBlocks: [...state.foldedBlocks, ...collapse] };
        });
        if (collapse.length > 0) foldPersister?.({ collapse });
      },
      unfoldAll: (entityIDs: string[]) => {
        let uncollapse: string[] = [];
        set((state) => {
          uncollapse = state.foldedBlocks.filter((f) => entityIDs.includes(f));
          if (uncollapse.length === 0) return state;
          return {
            foldedBlocks: state.foldedBlocks.filter(
              (f) => !entityIDs.includes(f),
            ),
          };
        });
        if (uncollapse.length > 0) foldPersister?.({ uncollapse });
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
