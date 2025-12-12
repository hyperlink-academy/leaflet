import { XmlElement, XmlText, XmlHook } from "yjs";

export type Delta = {
  insert: string;
  attributes?: {
    strong?: {};
    code?: {};
    em?: {};
    underline?: {};
    strikethrough?: {};
    highlight?: { color: string };
    link?: { href: string };
  };
};

export function YJSFragmentToString(
  node: XmlElement | XmlText | XmlHook,
): string {
  if (node.constructor === XmlElement) {
    // Handle hard_break nodes specially
    if (node.nodeName === "hard_break") {
      return "\n";
    }
    // Handle inline mention nodes
    if (node.nodeName === "didMention" || node.nodeName === "atMention") {
      return node.getAttribute("text") || "";
    }
    return node
      .toArray()
      .map((f) => YJSFragmentToString(f))
      .join("");
  }
  if (node.constructor === XmlText) {
    return (node.toDelta() as Delta[])
      .map((d) => {
        return d.insert;
      })
      .join("");
  }
  return "";
}
