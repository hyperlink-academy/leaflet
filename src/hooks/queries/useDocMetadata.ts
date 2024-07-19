import { useBlocks } from "./useBlocks";

export function useDocMetadata(entityID: string) {
  let blocks = useBlocks(entityID);

  let textBlocks = blocks.filter(
    (block) => block.type === "text" || block.type === "heading",
  );

  return textBlocks.slice(0, 3);
}

// filter out everything that isn't a heading or text block'
// get content for the first two , maybe three?
// if anything overflows, hide it
// if there isn't any text content... placeholder? "untitled page..."?
