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

// While a mutator is registered (CollapsedBlocksSync, for a signed-in user
// with write rights), the fold actions send their delta as a Replicache
// mutation instead of writing the store, and foldedBlocks is a mirror of the
// user's synced fact filled by the sync's inbound effect — the standard
// mutation → subscription → view flow. With nothing registered (signed out,
// read-only) the actions write the store directly and folds stay ephemeral.
export type FoldDelta = { collapse?: string[]; uncollapse?: string[] };
let foldMutator: ((delta: FoldDelta) => void) | null = null;
export const registerFoldMutator = (mutate: (delta: FoldDelta) => void) => {
  foldMutator = mutate;
  return () => {
    if (foldMutator === mutate) foldMutator = null;
  };
};
export const foldStateIsSynced = () => foldMutator !== null;

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
    (set, get) => ({
      setOpenPopover: (id: string | null) => {
        set({ openPopover: id });
      },
      toggleFold: (entityID: string) => {
        let folded = get().foldedBlocks.includes(entityID);
        if (foldMutator)
          return foldMutator(
            folded ? { uncollapse: [entityID] } : { collapse: [entityID] },
          );
        set((state) => ({
          foldedBlocks: folded
            ? state.foldedBlocks.filter((b) => b !== entityID)
            : [...state.foldedBlocks, entityID],
        }));
      },
      foldAll: (entityIDs: string[]) => {
        let collapse = entityIDs.filter(
          (e) => !get().foldedBlocks.includes(e),
        );
        if (collapse.length === 0) return;
        if (foldMutator) return foldMutator({ collapse });
        set((state) => ({
          foldedBlocks: [...state.foldedBlocks, ...collapse],
        }));
      },
      unfoldAll: (entityIDs: string[]) => {
        let uncollapse = get().foldedBlocks.filter((f) =>
          entityIDs.includes(f),
        );
        if (uncollapse.length === 0) return;
        if (foldMutator) return foldMutator({ uncollapse });
        set((state) => ({
          foldedBlocks: state.foldedBlocks.filter(
            (f) => !entityIDs.includes(f),
          ),
        }));
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
