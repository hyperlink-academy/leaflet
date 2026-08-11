import { useCallback } from "react";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { supabaseBrowserClient } from "supabase/browserClient";
import { localImages, uploadImageAndFinalize } from "src/utils/addImage";
import { setImageUploadStatus } from "src/utils/imageUploadStatus";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";

// Helper function to load image dimensions and thumbhash
const processImage = async (
  file: File,
): Promise<{
  width: number;
  height: number;
  thumbhash: string;
}> => {
  // Generate thumbhash (createImageBitmap also gives us the natural dimensions,
  // so there's no need to decode the file a second time via an HTMLImageElement).
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const imageBitmap = await createImageBitmap(blob);

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

export const useHandleCanvasDrop = (entityID: string) => {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();

  return useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!rep) return;

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      // Filter for image files only
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (imageFiles.length === 0) return;

      const parentRect = e.currentTarget.getBoundingClientRect();
      const dropX = Math.max(e.clientX - parentRect.left, 0);
      const dropY = Math.max(e.clientY - parentRect.top, 0);

      const SPACING = 0;
      const DEFAULT_WIDTH = 360;

      // Process all images to get dimensions and thumbhashes
      const processedImages = await Promise.all(
        imageFiles.map((file) => processImage(file)),
      );

      // Calculate grid dimensions based on image count
      const COLUMNS = Math.ceil(Math.sqrt(imageFiles.length));

      // Calculate the width and height for each column and row
      const colWidths: number[] = [];
      const rowHeights: number[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const col = i % COLUMNS;
        const row = Math.floor(i / COLUMNS);
        const dims = processedImages[i];

        // Scale image to fit within DEFAULT_WIDTH while maintaining aspect ratio
        const scale = DEFAULT_WIDTH / dims.width;
        const scaledWidth = DEFAULT_WIDTH;
        const scaledHeight = dims.height * scale;

        // Track max width for each column and max height for each row
        colWidths[col] = Math.max(colWidths[col] || 0, scaledWidth);
        rowHeights[row] = Math.max(rowHeights[row] || 0, scaledHeight);
      }

      const client = supabaseBrowserClient();

      // Calculate positions and prepare data for all images
      const imageBlocks = imageFiles.map((file, index) => {
        const entity = v7();
        const fileID = v7();
        const row = Math.floor(index / COLUMNS);
        const col = index % COLUMNS;

        // Calculate x position by summing all previous column widths
        let x = dropX;
        for (let c = 0; c < col; c++) {
          x += colWidths[c] + SPACING;
        }

        // Calculate y position by summing all previous row heights
        let y = dropY;
        for (let r = 0; r < row; r++) {
          y += rowHeights[r] + SPACING;
        }

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
        // Create all blocks with image facts
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

        // Upload all files to storage in parallel
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

      return true;
    },
    [rep, entityID, entity_set.set, undoManager],
  );
};
