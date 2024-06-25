import { XmlElement, XmlHook, XmlText } from "yjs";
import { nodes, marks } from "prosemirror-schema-basic";
export function RenderYJSFragment({
  node,
}: {
  node: XmlElement | XmlText | XmlHook;
}) {
  if (node.constructor === XmlElement) {
    switch (node.nodeName as keyof typeof nodes) {
      case "paragraph": {
        let children = node.toArray();
        return (
          <p>
            {children.length === 0 ? (
              <br />
            ) : (
              node
                .toArray()
                .map((f, index) => <RenderYJSFragment node={f} key={index} />)
            )}
          </p>
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
