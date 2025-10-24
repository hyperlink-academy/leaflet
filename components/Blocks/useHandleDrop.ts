import { useCallback } from "react";
import { useReplicache } from "src/replicache";
import { generateKeyBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";

export const useHandleDrop = (params: {
  parent: string;
  position: string | null;
  nextPosition: string | null;
}) => {
  let { rep } = useReplicache();
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

      let currentPosition = params.position;

      // Calculate positions for all images first
      const imageBlocks = imageFiles.map((file) => {
        const entity = v7();
        const position = generateKeyBetween(
          currentPosition,
          params.nextPosition,
        );
        currentPosition = position;
        return { file, entity, position };
      });

      // Create all blocks in parallel
      await Promise.all(
        imageBlocks.map((block) =>
          rep.mutate.addBlock({
            parent: params.parent,
            factID: v7(),
            permission_set: entity_set.set,
            type: "image",
            position: block.position,
            newEntityID: block.entity,
          }),
        ),
      );

      // Upload all images in parallel
      await Promise.all(
        imageBlocks.map((block) =>
          addImage(block.file, rep, {
            entityID: block.entity,
            attribute: "block/image",
          }),
        ),
      );

      return true;
    },
    [rep, params.position, params.nextPosition, params.parent, entity_set.set],
  );
};
