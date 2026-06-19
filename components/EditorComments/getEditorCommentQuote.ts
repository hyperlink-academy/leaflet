import { Doc, applyUpdate, XmlElement, XmlText } from "yjs";
import * as base64 from "base64-js";
import { Delta, YJSFragmentToString } from "src/utils/yjsFragmentToString";

function decodeYDoc(value: string): Doc {
  let doc = new Doc();
  applyUpdate(doc, base64.toByteArray(value));
  return doc;
}

// Plain text of an encoded YJS doc (e.g. a comment's content), for excerpts
export function getEditorCommentPlaintext(value: string | undefined): string {
  if (!value) return "";
  return decodeYDoc(value)
    .getXmlElement("prosemirror")
    .toArray()
    .map((n) => YJSFragmentToString(n))
    .join("\n");
}

// Extracts the text covered by a comment's mark from a block's encoded YJS
// doc, for showing the quoted range alongside the comment.
export function getEditorCommentQuoteText(
  value: string | undefined,
  commentID: string,
): string {
  if (!value) return "";
  let doc = decodeYDoc(value);
  let parts: string[] = [];
  let walk = (node: XmlElement | XmlText | unknown) => {
    if (node instanceof XmlText) {
      for (let d of node.toDelta() as Delta[]) {
        // Anchor marks hold a space-separated ID list where comments overlap
        let ids = (d.attributes?.comment?.commentID || "").split(" ");
        if (ids.includes(commentID)) parts.push(d.insert);
      }
    } else if (node instanceof XmlElement) {
      for (let child of node.toArray()) walk(child);
    }
  };
  for (let n of doc.getXmlElement("prosemirror").toArray()) walk(n);
  return parts.join("");
}
