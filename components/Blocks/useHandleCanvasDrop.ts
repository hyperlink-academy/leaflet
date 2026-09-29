import { type RefObject, useCallback, useEffect } from "react";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { addImage } from "src/utils/addImage";
import { clientToCanvas } from "src/canvasZoom/session";
import { useUIState } from "src/useUIState";
import { elementId } from "src/utils/elementId";
import { type CanvasBounds, clampToCanvas } from "src/utils/embeddedCanvasSize";

const IMAGE_WIDTH = 360;

const imageFilesOf = (data: DataTransfer | null) =>
  Array.from(data?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );

const heightAtImageWidth = async (file: File) => {
  let bitmap = await createImageBitmap(file);
  let height = bitmap.height * (IMAGE_WIDTH / bitmap.width);
  bitmap.close();
  return height;
};

// Adds the images to the canvas as a grid. `place` gets the grid's footprint
// in canvas px and returns where its top-left corner goes.
const useAddCanvasImages = (entityID: string) => {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();

  return useCallback(
    async (
      imageFiles: File[],
      place: (grid: { width: number; height: number }) => {
        x: number;
        y: number;
      },
    ) => {
      if (!rep || imageFiles.length === 0) return;

      const heights = await Promise.all(imageFiles.map(heightAtImageWidth));
      const COLUMNS = Math.ceil(Math.sqrt(imageFiles.length));
      const rowHeights: number[] = [];
      heights.forEach((height, i) => {
        const row = Math.floor(i / COLUMNS);
        rowHeights[row] = Math.max(rowHeights[row] || 0, height);
      });
      const origin = place({
        width: COLUMNS * IMAGE_WIDTH,
        height: rowHeights.reduce((total, size) => total + size, 0),
      });

      await undoManager.withUndoGroup(async () => {
        const entities = imageFiles.map(() => v7());
        for (const [index, entity] of entities.entries()) {
          let y = origin.y;
          for (let r = 0; r < Math.floor(index / COLUMNS); r++)
            y += rowHeights[r];
          await rep.mutate.addCanvasBlock({
            newEntityID: entity,
            parent: entityID,
            position: { x: origin.x + (index % COLUMNS) * IMAGE_WIDTH, y },
            factID: v7(),
            type: "image",
            permission_set: entity_set.set,
          });
        }
        await Promise.all(
          imageFiles.map((file, index) =>
            addImage(file, rep, {
              entityID: entities[index],
              attribute: "block/image",
            }),
          ),
        );
      });
    },
    [rep, entityID, entity_set.set, undoManager],
  );
};

export const useHandleCanvasDrop = (entityID: string) => {
  let addImages = useAddCanvasImages(entityID);

  return useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const imageFiles = imageFilesOf(e.dataTransfer);
      if (imageFiles.length === 0) return;

      const p = clientToCanvas(e.currentTarget, entityID, e);
      const drop = { x: Math.max(p.x, 0), y: Math.max(p.y, 0) };

      await addImages(imageFiles, () => drop);
    },
    [addImages, entityID],
  );
};

// With the canvas itself focused there is no block to paste into, so pasted
// images land in the middle of the part of the canvas that is on screen.
export const useHandleCanvasPaste = (
  entityID: string,
  content: RefObject<HTMLElement | null>,
  canvas: CanvasBounds,
  enabled: boolean,
) => {
  let addImages = useAddCanvasImages(entityID);

  useEffect(() => {
    if (!enabled) return;
    let onPaste = (e: ClipboardEvent) => {
      let focused = useUIState.getState().focusedEntity;
      if (focused?.entityType !== "page" || focused.entityID !== entityID)
        return;
      let active = document.activeElement;
      if (
        e.defaultPrevented ||
        (active instanceof HTMLElement &&
          (active.isContentEditable ||
            active.matches("input, textarea, select")))
      )
        return;
      let imageFiles = imageFilesOf(e.clipboardData);
      let scrollArea = document.getElementById(
        elementId.page(entityID).canvasScrollArea,
      );
      if (imageFiles.length === 0 || !content.current || !scrollArea) return;
      e.preventDefault();

      let visible = scrollArea.getBoundingClientRect();
      let center = clientToCanvas(content.current, entityID, {
        clientX:
          (Math.max(visible.left, 0) +
            Math.min(visible.right, window.innerWidth)) /
          2,
        clientY:
          (Math.max(visible.top, 0) +
            Math.min(visible.bottom, window.innerHeight)) /
          2,
      });
      addImages(imageFiles, (grid) => {
        let position = clampToCanvas(
          {
            x: center.x - grid.width / 2,
            y: center.y - grid.height / 2,
          },
          grid,
          canvas,
        );
        return { x: Math.max(position.x, 0), y: Math.max(position.y, 0) };
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImages, entityID, content, canvas, enabled]);
};
