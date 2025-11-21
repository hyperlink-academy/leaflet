"use client";
import { Agent, AppBskyRichtextFacet, UnicodeString } from "@atproto/api";
import {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import * as Popover from "@radix-ui/react-popover";
import { EditorState, TextSelection, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, MarkSpec, Mark } from "prosemirror-model";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import { inputRules, InputRule } from "prosemirror-inputrules";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { IOSBS } from "app/lish/[did]/[publication]/[rkey]/Interactions/Comments/CommentBox";

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
  editorStateRef: React.MutableRefObject<EditorState | null>;
  initialContent?: string;
  onCharCountChange?: (count: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    range: { from: number; to: number } | null;
    selectedMention: { handle: string; did: string } | null;
  }>({ active: false, range: null, selectedMention: null });

  const handleMentionSelect = useCallback(
    (
      mention: { handle: string; did: string },
      range: { from: number; to: number },
    ) => {
      if (!viewRef.current) return;
      const view = viewRef.current;
      const { from, to } = range;
      const tr = view.state.tr;

      // Delete the query text (keep the @)
      tr.delete(from + 1, to);

      // Insert the mention text after the @
      const mentionText = mention.handle;
      tr.insertText(mentionText, from + 1);

      // Apply mention mark to @ and handle
      tr.addMark(
        from,
        from + 1 + mentionText.length,
        bskyPostSchema.marks.mention.create({ did: mention.did }),
      );

      // Add a space after the mention
      tr.insertText(" ", from + 1 + mentionText.length);

      view.dispatch(tr);
      view.focus();
    },
    [],
  );

  const mentionStateRef = useRef(mentionState);
  mentionStateRef.current = mentionState;

  useLayoutEffect(() => {
    if (!mountRef.current) return;

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
        inputRules({ rules: [createHashtagInputRule()] }),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Shift-Mod-z": redo,
          Enter: (state, dispatch) => {
            // Check if mention autocomplete is active
            const currentMentionState = mentionStateRef.current;
            if (
              currentMentionState.active &&
              currentMentionState.selectedMention &&
              currentMentionState.range
            ) {
              handleMentionSelect(
                currentMentionState.selectedMention,
                currentMentionState.range,
              );
              return true;
            }
            // Otherwise let the default Enter behavior happen (new paragraph)
            return false;
          },
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
  }, [handleMentionSelect]);

  return (
    <div className="relative w-full h-full group">
      {editorState && (
        <MentionAutocomplete
          editorState={editorState}
          view={viewRef}
          onSelect={handleMentionSelect}
          onMentionStateChange={(active, range, selectedMention) => {
            setMentionState({ active, range, selectedMention });
          }}
        />
      )}
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

function MentionAutocomplete(props: {
  editorState: EditorState;
  view: React.RefObject<EditorView | null>;
  onSelect: (
    mention: { handle: string; did: string },
    range: { from: number; to: number },
  ) => void;
  onMentionStateChange: (
    active: boolean,
    range: { from: number; to: number } | null,
    selectedMention: { handle: string; did: string } | null,
  ) => void;
}) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionRange, setMentionRange] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [mentionCoords, setMentionCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const { suggestionIndex, setSuggestionIndex, suggestions } =
    useMentionSuggestions(mentionQuery);

  // Check for mention pattern whenever editor state changes
  useEffect(() => {
    const { $from } = props.editorState.selection;
    const textBefore = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 50),
      $from.parentOffset,
      null,
      "\ufffc",
    );

    // Look for @ followed by word characters before cursor
    const match = textBefore.match(/@([\w.]*)$/);

    if (match && props.view.current) {
      const queryBefore = match[1];
      const from = $from.pos - queryBefore.length - 1;

      // Get text after cursor to find the rest of the handle
      const textAfter = $from.parent.textBetween(
        $from.parentOffset,
        Math.min($from.parent.content.size, $from.parentOffset + 50),
        null,
        "\ufffc",
      );

      // Match word characters after cursor until space or end
      const afterMatch = textAfter.match(/^([\w.]*)/);
      const queryAfter = afterMatch ? afterMatch[1] : "";

      // Combine the full handle
      const query = queryBefore + queryAfter;
      const to = $from.pos + queryAfter.length;

      setMentionQuery(query);
      setMentionRange({ from, to });

      // Get coordinates for the autocomplete popup
      const coords = props.view.current.coordsAtPos(from);
      setMentionCoords({
        top: coords.bottom + window.scrollY,
        left: coords.left + window.scrollX,
      });
      setSuggestionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionRange(null);
      setMentionCoords(null);
    }
  }, [props.editorState, props.view, setSuggestionIndex]);

  // Update parent's mention state
  useEffect(() => {
    const active = mentionQuery !== null && suggestions.length > 0;
    const selectedMention =
      active && suggestions[suggestionIndex]
        ? suggestions[suggestionIndex]
        : null;
    props.onMentionStateChange(active, mentionRange, selectedMention);
  }, [mentionQuery, suggestions, suggestionIndex, mentionRange]);

  // Handle keyboard navigation for arrow keys only
  useEffect(() => {
    if (!mentionQuery || !props.view.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (suggestionIndex > 0) {
          setSuggestionIndex((i) => i - 1);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (suggestionIndex < suggestions.length - 1) {
          setSuggestionIndex((i) => i + 1);
        }
      }
    };

    const dom = props.view.current.dom;
    dom.addEventListener("keydown", handleKeyDown);

    return () => {
      dom.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    mentionQuery,
    suggestions,
    suggestionIndex,
    props.view,
    setSuggestionIndex,
  ]);

  if (!mentionCoords || suggestions.length === 0) return null;

  // The styles in this component should match the Menu styles in components/Layout.tsx
  return (
    <Popover.Root open>
      {createPortal(
        <Popover.Anchor
          style={{
            top: mentionCoords.top,
            left: mentionCoords.left,
            position: "absolute",
          }}
        />,
        document.body,
      )}
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={20}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={`dropdownMenu z-20 bg-bg-page flex flex-col py-1 gap-0.5 border border-border rounded-md shadow-md`}
        >
          <ul className="list-none p-0 text-sm">
            {suggestions.map((result, index) => {
              return (
                <div
                  className={`
                    MenuItem
                    font-bold z-10 py-1 px-3
                    text-left text-secondary
                    flex gap-2
                    ${index === suggestionIndex ? "bg-border-light data-[highlighted]:text-secondary" : ""}
                    hover:bg-border-light hover:text-secondary
                    outline-none
                    `}
                  key={result.did}
                  onClick={() => {
                    if (mentionRange) {
                      props.onSelect(result, mentionRange);
                      setMentionQuery(null);
                      setMentionRange(null);
                      setMentionCoords(null);
                    }
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  @{result.handle}
                </div>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function useMentionSuggestions(query: string | null) {
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<
    { handle: string; did: string }[]
  >([]);

  useDebouncedEffect(
    async () => {
      if (!query) {
        setSuggestions([]);
        return;
      }

      const agent = new Agent("https://public.api.bsky.app");
      const result = await agent.searchActorsTypeahead({
        q: query,
        limit: 8,
      });
      setSuggestions(
        result.data.actors.map((actor) => ({
          handle: actor.handle,
          did: actor.did,
        })),
      );
    },
    300,
    [query],
  );

  useEffect(() => {
    if (suggestionIndex > suggestions.length - 1) {
      setSuggestionIndex(Math.max(0, suggestions.length - 1));
    }
  }, [suggestionIndex, suggestions.length]);

  return {
    suggestions,
    suggestionIndex,
    setSuggestionIndex,
  };
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
