import { useBlocks } from "./useBlocks";

export function usePageMetadata(entityID: string) {
  let blocks = useBlocks(entityID);

  let textBlocks = blocks.filter(
    (block) => block.type === "text" || block.type === "heading",
  );

  return textBlocks.slice(0, 3);
}
