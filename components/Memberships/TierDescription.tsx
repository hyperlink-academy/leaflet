import { CSSProperties } from "react";
import { theme } from "tailwind.config";
import {
  parseTierDescriptionDoc,
  TierDescriptionInline,
} from "src/utils/tierDescriptionDoc";

// Static renderer for a tier description: rich (ProseMirror doc JSON) or
// legacy plain text. Rendered from JSON node-by-node rather than as HTML so
// only the node/mark types listed here can ever reach readers.
export function TierDescription(props: { description: string }) {
  let doc = parseTierDescriptionDoc(props.description);
  if (!doc) return <p>{props.description}</p>;
  return (
    <>
      {doc.content.map((node, index) => {
        if (node.type !== "paragraph") return null;
        let children = node.content ?? [];
        return (
          <p key={index}>
            {children.length === 0 ? (
              <br />
            ) : (
              children.map((child, childIndex) => (
                <InlineNode key={childIndex} node={child} />
              ))
            )}
          </p>
        );
      })}
    </>
  );
}

function InlineNode(props: { node: TierDescriptionInline }) {
  if (props.node.type === "hard_break") return <br />;
  if (props.node.type !== "text" || !props.node.text) return null;

  let style: CSSProperties = {};
  let href: string | null = null;
  for (let mark of props.node.marks ?? []) {
    switch (mark.type) {
      case "strong":
        style.fontWeight = 700;
        break;
      case "em":
        style.fontStyle = "italic";
        break;
      case "underline":
        style.textDecoration = "underline";
        break;
      case "strikethrough":
        style.textDecoration = style.textDecoration
          ? "underline line-through"
          : "line-through";
        style.textDecorationColor = theme.colors.tertiary;
        break;
      case "link":
        href = safeLinkHref(mark.attrs?.href);
        break;
    }
  }

  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-accent-contrast"
        style={style}
      >
        {props.node.text}
      </a>
    );
  return <span style={style}>{props.node.text}</span>;
}

function safeLinkHref(href: string | undefined): string | null {
  if (!href) return null;
  try {
    let url = new URL(href);
    if (["http:", "https:", "mailto:"].includes(url.protocol)) return href;
  } catch {}
  return null;
}
