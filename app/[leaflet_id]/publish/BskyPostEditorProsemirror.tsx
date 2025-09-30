"use client";
import { Agent } from "@atproto/api";
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
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, MarkSpec } from "prosemirror-model";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";

// Schema with only links and mentions marks
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
        handle: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "span.mention",
          getAttrs(dom: HTMLElement) {
            return {
              handle: dom.getAttribute("data-handle"),
            };
          },
        },
      ],
      toDOM(node) {
        let { handle } = node.attrs;
        return [
          "span",
          {
            class: "mention text-accent-contrast",
            "data-handle": handle,
          },
          0,
        ];
      },
    } as MarkSpec,
  },
});

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
    selectedHandle: string | null;
  }>({ active: false, range: null, selectedHandle: null });

  const handleMentionSelect = useCallback(
    (handle: string, range: { from: number; to: number }) => {
      if (!viewRef.current) return;
      const view = viewRef.current;
      const { from, to } = range;
      const tr = view.state.tr;

      // Delete the query text (keep the @)
      tr.delete(from + 1, to);

      // Insert the mention text after the @
      const mentionText = handle;
      tr.insertText(mentionText, from + 1);

      // Apply mention mark to @ and handle
      tr.addMark(
        from,
        from + 1 + mentionText.length,
        bskyPostSchema.marks.mention.create({ handle }),
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
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Shift-Mod-z": redo,
          Enter: (state, dispatch) => {
            // Check if mention autocomplete is active
            const currentMentionState = mentionStateRef.current;
            if (
              currentMentionState.active &&
              currentMentionState.selectedHandle &&
              currentMentionState.range
            ) {
              handleMentionSelect(
                currentMentionState.selectedHandle,
                currentMentionState.range,
              );
              return true;
            }
            // Otherwise let the default Enter behavior happen (new paragraph)
            return false;
          },
        }),
        keymap(baseKeymap),
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
          props.onCharCountChange?.(newState.doc.textContent.length);
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
    <div className="relative w-full h-full">
      {editorState && (
        <MentionAutocomplete
          editorState={editorState}
          view={viewRef}
          onSelect={handleMentionSelect}
          onMentionStateChange={(active, range, selectedHandle) => {
            setMentionState({ active, range, selectedHandle });
          }}
        />
      )}
      <div
        ref={mountRef}
        className="border-none outline-none whitespace-pre-wrap min-h-[80px] max-h-[200px] overflow-y-auto prose-sm"
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
        }}
      />
    </div>
  );
}

function MentionAutocomplete(props: {
  editorState: EditorState;
  view: React.RefObject<EditorView | null>;
  onSelect: (handle: string, range: { from: number; to: number }) => void;
  onMentionStateChange: (
    active: boolean,
    range: { from: number; to: number } | null,
    selectedHandle: string | null,
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
    const selectedHandle =
      active && suggestions[suggestionIndex]
        ? suggestions[suggestionIndex]
        : null;
    props.onMentionStateChange(active, mentionRange, selectedHandle);
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
                  key={result}
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
                  @{result}
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
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
      setSuggestions(result.data.actors.map((actor) => actor.handle));
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
