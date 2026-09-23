import { usePageReadingOrder } from "./useBlocks";

export function usePageMetadata(entityID: string | null) {
  let blocks = usePageReadingOrder(entityID);

  let textBlocks = blocks.filter(
    (block) => block.type === "text" || block.type === "heading",
  );

  return textBlocks.slice(0, 3);
}
