"use client";
import { Agent } from "@atproto/api";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import * as Popover from "@radix-ui/react-popover";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { callRPC } from "app/api/rpc/client";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { onMouseDown } from "src/utils/iosInputMouseDown";

export function MentionAutocomplete(props: {
  editorState: EditorState;
  view: React.RefObject<EditorView | null>;
  onSelect: (mention: Mention, range: { from: number; to: number }) => void;
  onMentionStateChange: (
    active: boolean,
    range: { from: number; to: number } | null,
    selectedMention: Mention | null,
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
    const match = textBefore.match(/(?:^|\s)@([\w.]*)$/);

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
        e.stopPropagation();

        if (suggestionIndex > 0) {
          setSuggestionIndex((i) => i - 1);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();

        if (suggestionIndex < suggestions.length - 1) {
          setSuggestionIndex((i) => i + 1);
        }
      }
    };

    const dom = props.view.current.dom;
    dom.addEventListener("keydown", handleKeyDown, true);

    return () => {
      dom.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    mentionQuery,
    suggestions,
    suggestionIndex,
    props.view,
    setSuggestionIndex,
  ]);

  if (!mentionCoords || suggestions.length === 0) return null;

  const headerStyle = "text-xs text-tertiary font-bold pt-1 px-2";

  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const order: Mention["type"][] = ["did", "publication"];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

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
          className={`dropdownMenu z-20 bg-bg-page flex flex-col p-1 gap-1 border border-border rounded-md shadow-md sm:max-w-xs w-[1000px] max-w-(--radix-popover-content-available-width)
          max-h-(--radix-popover-content-available-height)
          overflow-y-scroll`}
        >
          <ul className="list-none p-0 text-sm">
            {sortedSuggestions.map((result, index) => {
              const prevResult = sortedSuggestions[index - 1];
              const showHeader =
                prevResult && prevResult.type !== result.type;

              const [key, resultText, subtext] =
                result.type === "did"
                  ? [
                      result.did,
                      result.displayName || `@${result.handle}`,
                      result.displayName ? `@${result.handle}` : undefined,
                    ]
                  : [result.uri, result.name, undefined];

              return (
                <>
                  {showHeader && (
                    <>
                      <hr className="border-border-light mx-1 my-1" />
                      <div className={headerStyle}>Publications</div>
                    </>
                  )}
                  <Result
                    key={key}
                    onClick={() => {
                      if (mentionRange) {
                        props.onSelect(result, mentionRange);
                        setMentionQuery(null);
                        setMentionRange(null);
                        setMentionCoords(null);
                      }
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    result={resultText}
                    subtext={subtext}
                    selected={index === suggestionIndex}
                  />
                </>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const Result = (props: {
  result: React.ReactNode;
  subtext?: React.ReactNode;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
}) => {
  return (
    <div
      className={`
        menuItem  flex-col! gap-0!
        text-secondary leading-tight text-sm truncate
      ${props.subtext ? "py-1!" : "py-2!"}
        ${props.selected ? "bg-[var(--accent-light)]" : ""}`}
      onClick={() => props.onClick()}
      onMouseDown={(e) => props.onMouseDown(e)}
    >
      <div className={`flex gap-2 items-center `}>
        <div className="truncate w-full grow min-w-0 ">{props.result}</div>
      </div>
      {props.subtext && (
        <div className="text-tertiary italic text-xs font-normal min-w-0 truncate pb-[1px]">
          {props.subtext}
        </div>
      )}
    </div>
  );
};

export type Mention =
  | { type: "did"; handle: string; did: string; displayName?: string }
  | { type: "publication"; uri: string; name: string };
function useMentionSuggestions(query: string | null) {
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<Mention>>([]);

  useDebouncedEffect(
    async () => {
      if (!query) {
        setSuggestions([]);
        return;
      }

      const agent = new Agent("https://public.api.bsky.app");
      const [result, publications] = await Promise.all([
        agent.searchActorsTypeahead({
          q: query,
          limit: 8,
        }),
        callRPC(`search_publication_names`, { query, limit: 8 }),
      ]);
      setSuggestions([
        ...result.data.actors.map((actor) => ({
          type: "did" as const,
          handle: actor.handle,
          did: actor.did,
          displayName: actor.displayName,
        })),
        ...publications.result.publications.map((p) => ({
          type: "publication" as const,
          uri: p.uri,
          name: p.name,
        })),
      ]);
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
