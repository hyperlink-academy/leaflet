"use client";
import { AppBskyRichtextFacet, UnicodeString } from "@atproto/api";
import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, MarkSpec, Mark } from "prosemirror-model";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import { inputRules, InputRule } from "prosemirror-inputrules";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { IOSBS } from "app/lish/[did]/[publication]/[rkey]/Interactions/Comments/CommentBox";
import { schema } from "components/Blocks/TextBlock/schema";
import { Mention, MentionAutocomplete } from "components/Mention";

// Schema with only links, mentions, and hashtags marks
const bskyPostSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0] as const,
    },
    text: {
      group: "inline",
    },
  },
  marks: {
    link: {
      attrs: {
        href: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom: HTMLElement) {
            return {
              href: dom.getAttribute("href"),
            };
          },
        },
      ],
      toDOM(node) {
        let { href } = node.attrs;
        return ["a", { href, target: "_blank", class: "text-accent" }, 0];
      },
    } as MarkSpec,
    mention: {
      attrs: {
        did: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "span.mention",
          getAttrs(dom: HTMLElement) {
            return {
              did: dom.getAttribute("data-did"),
            };
          },
        },
      ],
      toDOM(node) {
        let { did } = node.attrs;
        return [
          "span",
          {
            class: "mention text-accent-contrast",
            "data-did": did,
          },
          0,
        ];
      },
    } as MarkSpec,
    hashtag: {
      attrs: {
        tag: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "span.hashtag",
          getAttrs(dom: HTMLElement) {
            return {
              tag: dom.getAttribute("data-tag"),
            };
          },
        },
      ],
      toDOM(node) {
        let { tag } = node.attrs;
        return [
          "span",
          {
            class: "hashtag text-accent-contrast",
            "data-tag": tag,
          },
          0,
        ];
      },
    } as MarkSpec,
  },
});

// Input rule to automatically apply hashtag mark
function createHashtagInputRule() {
  return new InputRule(/#([\w]+)\s$/, (state, match, start, end) => {
    const [fullMatch, tag] = match;
    const tr = state.tr;

    // Replace the matched text (including space) with just the hashtag and space
    tr.replaceWith(start, end, [
      state.schema.text("#" + tag),
      state.schema.text(" "),
    ]);

    // Apply hashtag mark to # and tag text only (not the space)
    tr.addMark(
      start,
      start + tag.length + 1,
      bskyPostSchema.marks.hashtag.create({ tag }),
    );

    return tr;
  });
}
export function BlueskyPostEditorProsemirror(props: {
  editorStateRef: React.RefObject<EditorState | null>;
  initialContent?: string;
  onCharCountChange?: (count: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionCoords, setMentionCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mentionInsertPos, setMentionInsertPos] = useState<number | null>(null);

  const openMentionAutocomplete = useCallback(() => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    const pos = view.state.selection.from;
    setMentionInsertPos(pos);
    const coords = view.coordsAtPos(pos - 1);
    setMentionCoords({
      top: coords.bottom + window.scrollY,
      left: coords.left + window.scrollX,
    });
    setMentionOpen(true);
  }, []);

  const handleMentionSelect = useCallback(
    (mention: Mention) => {
      if (mention.type !== "did") return;
      if (!viewRef.current || mentionInsertPos === null) return;
      const view = viewRef.current;
      const from = mentionInsertPos - 1;
      const to = mentionInsertPos;
      const tr = view.state.tr;

      // Delete the @ symbol
      tr.delete(from, to);

      // Insert @handle
      const mentionText = "@" + mention.handle;
      tr.insertText(mentionText, from);

      // Apply mention mark
      tr.addMark(
        from,
        from + mentionText.length,
        bskyPostSchema.marks.mention.create({ did: mention.did }),
      );

      // Add a space after the mention
      tr.insertText(" ", from + mentionText.length);

      view.dispatch(tr);
      view.focus();
    },
    [mentionInsertPos],
  );

  const handleMentionOpenChange = useCallback((open: boolean) => {
    setMentionOpen(open);
    if (!open) {
      setMentionCoords(null);
      setMentionInsertPos(null);
    }
  }, []);

  useLayoutEffect(() => {
    if (!mountRef.current) return;

    // Input rule to trigger mention autocomplete when @ is typed
    const mentionInputRule = new InputRule(
      /(?:^|\s)@$/,
      (state, match, start, end) => {
        setTimeout(() => openMentionAutocomplete(), 0);
        return null;
      },
    );

    const initialState = EditorState.create({
      schema: bskyPostSchema,
      doc: props.initialContent
        ? bskyPostSchema.nodeFromJSON({
            type: "doc",
            content: props.initialContent.split("\n").map((line) => ({
              type: "paragraph",
              content: line ? [{ type: "text", text: line }] : undefined,
            })),
          })
        : undefined,
      plugins: [
        inputRules({ rules: [createHashtagInputRule(), mentionInputRule] }),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Shift-Mod-z": redo,
        }),
        keymap(baseKeymap),
        autolink({
          type: bskyPostSchema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
        history(),
      ],
    });

    setEditorState(initialState);
    props.editorStateRef.current = initialState;

    const view = new EditorView(
      { mount: mountRef.current },
      {
        state: initialState,
        dispatchTransaction(tr) {
          const newState = view.state.apply(tr);
          view.updateState(newState);
          setEditorState(newState);
          props.editorStateRef.current = newState;
          props.onCharCountChange?.(
            newState.doc.textContent.length + newState.doc.children.length - 1,
          );
        },
      },
    );

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [openMentionAutocomplete]);

  return (
    <div className="relative w-full h-full group">
      <MentionAutocomplete
        open={mentionOpen}
        onOpenChange={handleMentionOpenChange}
        view={viewRef}
        onSelect={handleMentionSelect}
        coords={mentionCoords}
      />
      {editorState?.doc.textContent.length === 0 && (
        <div className="italic text-tertiary absolute top-0 left-0 pointer-events-none">
          Write a post to share your writing!
        </div>
      )}
      <div
        ref={mountRef}
        className="border-none outline-none whitespace-pre-wrap min-h-[80px] max-h-[200px] overflow-y-auto prose-sm"
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
        }}
      />
      <IOSBS view={viewRef} />
    </div>
  );
}

/**
 * Converts a ProseMirror editor state to Bluesky post facets.
 * Extracts mentions, links, and hashtags from the editor state and returns them
 * as an array of Bluesky richtext facets with proper byte positions.
 */
export function editorStateToFacetedText(
  state: EditorState,
): [string, AppBskyRichtextFacet.Main[]] {
  let fullText = "";
  let facets: AppBskyRichtextFacet.Main[] = [];
  let byteOffset = 0;

  // Iterate through each paragraph in the document
  state.doc.forEach((paragraph) => {
    if (paragraph.type.name !== "paragraph") return;

    // Process each inline node in the paragraph
    paragraph.forEach((node) => {
      if (node.isText) {
        const text = node.text || "";
        const unicodeString = new UnicodeString(text);

        // If this text node has marks, create a facet
        if (node.marks.length > 0) {
          const facet: AppBskyRichtextFacet.Main = {
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
    if (paragraph !== state.doc.lastChild) {
      const newline = "\n";
      const unicodeNewline = new UnicodeString(newline);
      fullText += newline;
      byteOffset += unicodeNewline.length;
    }
  });

  return [fullText, facets];
}

function marksToFeatures(marks: readonly Mark[]) {
  const features: AppBskyRichtextFacet.Main["features"] = [];

  for (const mark of marks) {
    switch (mark.type.name) {
      case "mention": {
        features.push({
          $type: "app.bsky.richtext.facet#mention",
          did: mark.attrs.did,
        });
        break;
      }
      case "hashtag": {
        features.push({
          $type: "app.bsky.richtext.facet#tag",
          tag: mark.attrs.tag,
        });
        break;
      }
      case "link":
        features.push({
          $type: "app.bsky.richtext.facet#link",
          uri: mark.attrs.href as string,
        });
        break;
    }
  }

  return features;
}

export const addMentionToEditor = (
  mention: Mention,
  range: { from: number; to: number },
  view: EditorView,
) => {
  if (!view) return;
  const { from, to } = range;
  const tr = view.state.tr;
  // Delete the query text (keep the @)
  tr.delete(from + 1, to);

  if (mention.type == "did") {
    tr.insertText(mention.handle, from + 1);
    tr.addMark(
      from,
      from + 1 + mention.handle.length,
      schema.marks.didMention.create({ did: mention.did }),
    );
    tr.insertText(" ", from + 1 + mention.handle.length);
  }
  if (mention.type === "publication" || mention.type === "post") {
    let name = mention.type == "post" ? mention.title : mention.name;
    tr.insertText(name, from + 1);
    tr.addMark(
      from,
      from + 1 + name.length,
      schema.marks.atMention.create({ atURI: mention.uri }),
    );
    tr.insertText(" ", from + 1 + name.length);
  }

  // Insert the mention text after the @

  view.dispatch(tr);
  view.focus();
};
