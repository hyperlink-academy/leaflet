import { type RefObject, useCallback, useEffect } from "react";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { supabaseBrowserClient } from "supabase/browserClient";
import { localImages, uploadImageAndFinalize } from "src/utils/addImage";
import { setImageUploadStatus } from "src/utils/imageUploadStatus";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { getCanvasZoom } from "src/canvasZoom/session";
import { useUIState } from "src/useUIState";
import { elementId } from "src/utils/elementId";
import { type CanvasBounds, clampToCanvas } from "src/utils/embeddedCanvasSize";

const processImage = async (
  file: File,
): Promise<{
  width: number;
  height: number;
  thumbhash: string;
}> => {
  const imageBitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const maxDimension = 100;
  let width = imageBitmap.width;
  let height = imageBitmap.height;

  if (width > height) {
    if (width > maxDimension) {
      height *= maxDimension / width;
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width *= maxDimension / height;
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(imageBitmap, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const thumbhash = thumbHashToDataURL(
    rgbaToThumbHash(imageData.width, imageData.height, imageData.data),
  );

  return {
    width: imageBitmap.width,
    height: imageBitmap.height,
    thumbhash,
  };
};

const imageFilesOf = (data: DataTransfer | null) =>
  Array.from(data?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );

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

      const DEFAULT_WIDTH = 360;
      const processedImages = await Promise.all(
        imageFiles.map((file) => processImage(file)),
      );
      const COLUMNS = Math.ceil(Math.sqrt(imageFiles.length));
      const rowHeights: number[] = [];
      processedImages.forEach((dims, i) => {
        const row = Math.floor(i / COLUMNS);
        const height = dims.height * (DEFAULT_WIDTH / dims.width);
        rowHeights[row] = Math.max(rowHeights[row] || 0, height);
      });

      const origin = place({
        width: COLUMNS * DEFAULT_WIDTH,
        height: rowHeights.reduce((total, size) => total + size, 0),
      });

      const client = supabaseBrowserClient();

      const imageBlocks = imageFiles.map((file, index) => {
        const entity = v7();
        const fileID = v7();
        const row = Math.floor(index / COLUMNS);
        const x = origin.x + (index % COLUMNS) * DEFAULT_WIDTH;
        let y = origin.y;
        for (let r = 0; r < row; r++) y += rowHeights[r];

        const url = client.storage
          .from("minilink-user-assets")
          .getPublicUrl(fileID).data.publicUrl;

        return {
          file,
          entity,
          fileID,
          url,
          position: { x, y },
          dimensions: processedImages[index],
        };
      });

      await undoManager.withUndoGroup(async () => {
        for (const block of imageBlocks) {
          localImages.set(block.url, URL.createObjectURL(block.file));
          setImageUploadStatus(block.url, { state: "uploading" });

          await rep.mutate.addCanvasBlock({
            newEntityID: block.entity,
            parent: entityID,
            position: block.position,
            factID: v7(),
            type: "image",
            permission_set: entity_set.set,
          });

          await rep.mutate.assertFact({
            entity: block.entity,
            attribute: "block/image",
            data: {
              fallback: block.dimensions.thumbhash,
              type: "image",
              local: rep.clientID,
              src: block.url,
              height: block.dimensions.height,
              width: block.dimensions.width,
            },
          });
        }

        await Promise.all(
          imageBlocks.map((block) =>
            uploadImageAndFinalize({
              rep,
              fileID: block.fileID,
              url: block.url,
              blob: block.file,
              file: block.file,
              entityID: block.entity,
              attribute: "block/image",
              thumbhash: block.dimensions.thumbhash,
              width: block.dimensions.width,
              height: block.dimensions.height,
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

      const parentRect = e.currentTarget.getBoundingClientRect();
      const zoom = getCanvasZoom(entityID);
      const drop = {
        x: Math.max((e.clientX - parentRect.left) / zoom, 0),
        y: Math.max((e.clientY - parentRect.top) / zoom, 0),
      };

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
      let origin = content.current.getBoundingClientRect();
      let zoom = getCanvasZoom(entityID);
      let center = {
        x:
          (Math.max(visible.left, 0) +
            Math.min(visible.right, window.innerWidth)) /
          2,
        y:
          (Math.max(visible.top, 0) +
            Math.min(visible.bottom, window.innerHeight)) /
          2,
      };
      addImages(imageFiles, (grid) => {
        let position = clampToCanvas(
          {
            x: (center.x - origin.left) / zoom - grid.width / 2,
            y: (center.y - origin.top) / zoom - grid.height / 2,
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
