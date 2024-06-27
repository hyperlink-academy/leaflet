import { XmlElement, XmlHook, XmlText } from "yjs";
import { nodes, marks } from "prosemirror-schema-basic";
import { CSSProperties } from "react";
export function RenderYJSFragment({
  node,
  wrapper,
}: {
  node: XmlElement | XmlText | XmlHook;
  wrapper?: "h1" | "h2" | "h3";
}) {
  if (node.constructor === XmlElement) {
    switch (node.nodeName as keyof typeof nodes) {
      case "paragraph": {
        let children = node.toArray();
        return (
          <BlockWrapper wrapper={wrapper}>
            {children.length === 0 ? (
              <br />
            ) : (
              node
                .toArray()
                .map((f, index) => <RenderYJSFragment node={f} key={index} />)
            )}
          </BlockWrapper>
        );
      }
      case "hard_break":
        return <br />;
      default:
        return null;
    }
  }
  if (node.constructor === XmlText) {
    return (
      <>
        {(node.toDelta() as Delta[]).map((d, index) => {
          if (d.attributes?.link)
            return (
              <a
                href={d.attributes.link.href}
                key={index}
                style={attributesToStyle(d)}
              >
                {d.insert}
              </a>
            );
          return (
            <span key={index} style={attributesToStyle(d)}>
              {d.insert}
            </span>
          );
        })}
      </>
    );
  }
  return null;
}

const BlockWrapper = (props: {
  wrapper?: "h1" | "h2" | "h3";
  children: React.ReactNode;
}) => {
  if (!props.wrapper) return <p>{props.children}</p>;
  switch (props.wrapper) {
    case "h1":
      return <h1>{props.children}</h1>;
    case "h2":
      return <h2>{props.children}</h2>;
    case "h3":
      return <h3>{props.children}</h3>;
  }
};

type Delta = {
  insert: string;
  attributes?: {
    strong?: {};
    em?: {};
    link?: { href: string };
  };
};

function attributesToStyle(d: Delta) {
  let style: CSSProperties = {};
  if (d.attributes?.strong) style.fontWeight = "700";
  if (d.attributes?.em) style.fontStyle = "italic";
  return style;
}

export function YJSFragmentToString(
  node: XmlElement | XmlText | XmlHook,
): string {
  if (node.constructor === XmlElement) {
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
      .join(" ");
  }
  return "";
}
