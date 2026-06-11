import { Doc, applyUpdate, XmlElement, XmlText } from "yjs";
import * as base64 from "base64-js";
import { Delta } from "src/utils/yjsFragmentToString";

// Extracts the text covered by a comment's mark from a block's encoded YJS
// doc, for showing the quoted range alongside the comment.
export function getCommentQuoteText(
  value: string | undefined,
  commentID: string,
): string {
  if (!value) return "";
  let doc = new Doc();
  applyUpdate(doc, base64.toByteArray(value));
  let parts: string[] = [];
  let walk = (node: XmlElement | XmlText | unknown) => {
    if (node instanceof XmlText) {
      for (let d of node.toDelta() as Delta[]) {
        if (d.attributes?.comment?.commentID === commentID)
          parts.push(d.insert);
      }
    } else if (node instanceof XmlElement) {
      for (let child of node.toArray()) walk(child);
    }
  };
  for (let n of doc.getXmlElement("prosemirror").toArray()) walk(n);
  return parts.join("");
}
