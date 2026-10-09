import { AtUri } from "@atproto/syntax";

export function isDocumentOwner(documentUri: string, did: string) {
  try {
    return new AtUri(documentUri).host === did;
  } catch {
    return false;
  }
}
