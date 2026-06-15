import * as Y from "yjs";
import * as base64 from "base64-js";

// Encode a plaintext string as a base64-encoded Yjs update suitable for storing
// in a "block/text" fact (the same representation the ProseMirror editor reads).
export function createYjsText(plaintext: string): string {
  let doc = new Y.Doc();
  let fragment = doc.getXmlFragment("prosemirror");
  let paragraph = new Y.XmlElement("paragraph");
  let textNode = new Y.XmlText();
  textNode.insert(0, plaintext);
  paragraph.insert(0, [textNode]);
  fragment.insert(0, [paragraph]);
  return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
}
