import { XmlElement, XmlHook, XmlText } from "yjs";
import { nodes, marks } from "prosemirror-schema-basic";
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
                className={attributesToClassName(d)}
              >
                {d.insert}
              </a>
            );
          return (
            <span key={index} className={attributesToClassName(d)}>
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

function attributesToClassName(d: Delta) {
  let className = "";
  if (d.attributes?.strong) className += "font-bold ";
  if (d.attributes?.em) className += "italic";
  return className;
}
