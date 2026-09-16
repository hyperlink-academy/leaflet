import { Doc, applyUpdate } from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "./yjsFragmentToString";

// Whether a block's stored "block/text" value has any content. Blocks hidden by
// a fold aren't rendered, so they have no editor in useEditorStates to read;
// this reads the persisted yjs doc instead. A block that's never been typed in
// has no fact at all.
export function storedBlockTextIsEmpty(value: string | undefined): boolean {
  if (!value) return true;
  let doc = new Doc();
  applyUpdate(doc, base64.toByteArray(value));
  return doc
    .getXmlElement("prosemirror")
    .toArray()
    .every((node) => YJSFragmentToString(node) === "");
}
