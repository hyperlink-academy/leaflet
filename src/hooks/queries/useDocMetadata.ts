import { useBlocks } from "./useBlocks";

type DocMetaData = {
  heading?: string;
  content?: string;
};

export function useDocMetadata(entityID: string) {
  let docMetadata: DocMetaData = {};
  let blocks = useBlocks(entityID);
  let firstBlock = blocks[0];
  let secondBlock = blocks[1];
  if (firstBlock?.type === "heading") {
    docMetadata.heading = blocks[0].value;
    if (secondBlock?.type === "text") docMetadata.content = blocks[1].value;
  } else {
    if (firstBlock?.type === "text") docMetadata.content = blocks[0].value;
  }
  return docMetadata;
}
