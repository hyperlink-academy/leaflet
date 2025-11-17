import { Doc, applyUpdate, XmlElement, XmlHook, XmlText } from "yjs";
import { nodes, marks } from "prosemirror-schema-basic";
import { CSSProperties, Fragment } from "react";
import { theme } from "tailwind.config";
import * as base64 from "base64-js";

type BlockElements = "h1" | "h2" | "h3" | null | "blockquote" | "p";
export function RenderYJSFragment({
  value,
  wrapper,
  attrs,
}: {
  value: string;
  wrapper: BlockElements;
  attrs?: { [k: string]: any };
}) {
  if (!value)
    return <BlockWrapper wrapper={wrapper} attrs={attrs}></BlockWrapper>;
  let doc = new Doc();
  const update = base64.toByteArray(value);
  applyUpdate(doc, update);
  let [node] = doc.getXmlElement("prosemirror").toArray();
  if (node.constructor === XmlElement) {
    switch (node.nodeName as keyof typeof nodes) {
      case "paragraph": {
        let children = node.toArray();
        return (
          <BlockWrapper wrapper={wrapper} attrs={attrs}>
            {children.length === 0 ? (
              <br />
            ) : (
              node.toArray().map((node, index) => {
                if (node.constructor === XmlText) {
                  let deltas = node.toDelta() as Delta[];
                  if (deltas.length === 0) return <br key={index} />;
                  return (
                    <Fragment key={index}>
                      {deltas.map((d, index) => {
                        if (d.attributes?.link)
                          return (
                            <a
                              href={d.attributes.link.href}
                              key={index}
                              {...attributesToStyle(d)}
                            >
                              {d.insert}
                            </a>
                          );
                        return (
                          <span
                            key={index}
                            {...attributesToStyle(d)}
                            {...attrs}
                          >
                            {d.insert}
                          </span>
                        );
                      })}
                    </Fragment>
                  );
                }

                return null;
              })
            )}
          </BlockWrapper>
        );
      }
      case "hard_break":
        return <div />;
      default:
        return null;
    }
  }
  return <br />;
}

const BlockWrapper = (props: {
  wrapper: BlockElements;
  children?: React.ReactNode;
  attrs?: { [k: string]: any };
}) => {
  if (props.wrapper === null && props.children === null) return <br />;
  if (props.wrapper === null) return <>{props.children}</>;
  switch (props.wrapper) {
    case "p":
      return <p {...props.attrs}>{props.children}</p>;
    case "blockquote":
      return <blockquote {...props.attrs}>{props.children}</blockquote>;

    case "h1":
      return <h1 {...props.attrs}>{props.children}</h1>;
    case "h2":
      return <h2 {...props.attrs}>{props.children}</h2>;
    case "h3":
      return <h3 {...props.attrs}>{props.children}</h3>;
  }
};

export type Delta = {
  insert: string;
  attributes?: {
    strong?: {};
    code?: {};
    em?: {};
    didMention?: { did: string };
    atMention?: { atURI: string };
    underline?: {};
    strikethrough?: {};
    highlight?: { color: string };
    link?: { href: string };
  };
};

function attributesToStyle(d: Delta) {
  let props = {
    style: {},
    className: "",
  } as { style: CSSProperties; className: string } & {
    [s: `data-${string}`]: any;
  };

  if (d.attributes?.code) props.className += " inline-code";
  if (d.attributes?.strong) props.style.fontWeight = "700";
  if (d.attributes?.em) props.style.fontStyle = "italic";
  if (d.attributes?.underline) props.style.textDecoration = "underline";
  if (d.attributes?.strikethrough) {
    (props.style.textDecoration = "line-through"),
      (props.style.textDecorationColor = theme.colors.tertiary);
  }
  if (d.attributes?.highlight) {
    props.className += " highlight";
    props["data-color"] = d.attributes.highlight.color;
    props.style.backgroundColor =
      d.attributes?.highlight.color === "1"
        ? theme.colors["highlight-1"]
        : d.attributes.highlight.color === "2"
          ? theme.colors["highlight-2"]
          : theme.colors["highlight-3"];
  }

  return props;
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
      .join("");
  }
  return "";
}
