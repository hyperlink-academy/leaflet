import { UnicodeString } from "@atproto/api";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { multiBlockSchema, schema } from "components/Blocks/TextBlock/schema";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Mark, Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useLayoutEffect, useRef, useState } from "react";
import { publishComment } from "./commentAction";
export function CommentBox(props: { doc_uri: string }) {
  let mountRef = useRef<HTMLPreElement | null>(null);
  let [editorState, setEditorState] = useState(() =>
    EditorState.create({
      schema: multiBlockSchema,
      plugins: [
        keymap(baseKeymap),
        keymap({
          "Meta-b": toggleMark(schema.marks.strong),
          "Ctrl-b": toggleMark(schema.marks.strong),
          "Meta-u": toggleMark(schema.marks.underline),
          "Ctrl-u": toggleMark(schema.marks.underline),
          "Meta-i": toggleMark(schema.marks.em),
          "Ctrl-i": toggleMark(schema.marks.em),
          "Ctrl-Meta-x": toggleMark(schema.marks.strikethrough),
        }),
        autolink({
          type: schema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
      ],
    }),
  );
  useLayoutEffect(() => {
    if (!mountRef.current) return;
    let view = new EditorView(
      { mount: mountRef.current },
      {
        state: editorState,
        handleClickOn: (view, _pos, node, _nodePos, _event, direct) => {
          if (!direct) return;
          if (node.nodeSize - 2 <= _pos) return;
          let mark =
            node
              .nodeAt(_pos - 1)
              ?.marks.find((f) => f.type === schema.marks.link) ||
            node
              .nodeAt(Math.max(_pos - 2, 0))
              ?.marks.find((f) => f.type === schema.marks.link);
          if (mark) {
            window.open(mark.attrs.href, "_blank");
          }
        },
        dispatchTransaction(tr) {
          let newState = this.state.apply(tr);
          setEditorState(newState);
          view.updateState(newState);
        },
      },
    );
    return () => {
      view.destroy();
    };
  }, []);
  return (
    <div className=" flex flex-col gap-2">
      <pre ref={mountRef} className="border" />
      <div className="flex justify-between">
        <div>toolbar</div>
        <button
          onClick={async () => {
            let [plaintext, facets] = docToFacetedText(editorState.doc);
            await publishComment({
              document: props.doc_uri,
              comment: { plaintext, facets },
            });
          }}
        >
          send
        </button>
      </div>
    </div>
  );
}

export function docToFacetedText(
  doc: Node,
): [string, PubLeafletRichtextFacet.Main[]] {
  let fullText = "";
  let facets: PubLeafletRichtextFacet.Main[] = [];
  let byteOffset = 0;

  // Iterate through each paragraph in the document
  doc.forEach((paragraph) => {
    if (paragraph.type.name !== "paragraph") return;

    // Process each inline node in the paragraph
    paragraph.forEach((node) => {
      if (node.isText) {
        const text = node.text || "";
        const unicodeString = new UnicodeString(text);

        // If this text node has marks, create a facet
        if (node.marks.length > 0) {
          const facet: PubLeafletRichtextFacet.Main = {
            index: {
              byteStart: byteOffset,
              byteEnd: byteOffset + unicodeString.length,
            },
            features: marksToFeatures(node.marks),
          };

          if (facet.features.length > 0) {
            facets.push(facet);
          }
        }

        fullText += text;
        byteOffset += unicodeString.length;
      }
    });

    // Add newline between paragraphs (except after the last one)
    if (paragraph !== doc.lastChild) {
      const newline = "\n";
      const unicodeNewline = new UnicodeString(newline);
      fullText += newline;
      byteOffset += unicodeNewline.length;
    }
  });

  return [fullText, facets];
}

function marksToFeatures(marks: readonly Mark[]) {
  const features: PubLeafletRichtextFacet.Main["features"] = [];

  for (const mark of marks) {
    switch (mark.type.name) {
      case "strong":
        features.push({
          $type: "pub.leaflet.richtext.facet#bold",
        });
        break;
      case "em":
        features.push({
          $type: "pub.leaflet.richtext.facet#italic",
        });
        break;
      case "underline":
        features.push({
          $type: "pub.leaflet.richtext.facet#underline",
        });
        break;
      case "strikethrough":
        features.push({
          $type: "pub.leaflet.richtext.facet#strikethrough",
        });
        break;
      case "code":
        features.push({
          $type: "pub.leaflet.richtext.facet#code",
        });
        break;
      case "highlight":
        features.push({
          $type: "pub.leaflet.richtext.facet#highlight",
        });
        break;
      case "link":
        features.push({
          $type: "pub.leaflet.richtext.facet#link",
          uri: mark.attrs.href as string,
        });
        break;
    }
  }

  return features;
}
