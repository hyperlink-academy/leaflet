import { AutosizeTextarea } from "components/utils/AutosizeTextarea";
import { Agent } from "@atproto/api";
import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { getCoordinatesInTextarea } from "src/utils/getCoordinatesInTextarea";
import * as Popover from "@radix-ui/react-popover";

export const BlueskyPostEditor = (props: {
  value: string;
  setValue: (value: string) => void;
}) => {
  let {
    suggestionPrefix,
    setSuggestionPrefix,
    setSuggestionIndex,
    suggestionIndex,
    suggestions,
    close,
  } = useSuggestions();
  let [cursorCoordinates, setCursorCoordinates] = useState<
    undefined | { textIndex: number; top: number; left: number }
  >(undefined);
  const onSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      let value = e.currentTarget.value,
        start = e.currentTarget.selectionStart,
        end = e.currentTarget.selectionEnd;
      if (start !== end) return setCursorCoordinates(undefined);

      let link = getLinkAtCursor(value, start);
      if (!link) {
        setSuggestionPrefix("");
        setCursorCoordinates(undefined);
        return;
      }
      setSuggestionPrefix(link.value);
      let coordinates = getCoordinatesInTextarea(e.currentTarget, link.start);
      let textareaPosition = e.currentTarget.getBoundingClientRect();
      setCursorCoordinates({
        textIndex: link.start,
        top:
          coordinates.top +
          textareaPosition.top +
          document.documentElement.scrollTop +
          coordinates.height,
        left: coordinates.left + textareaPosition.left,
      });
    },
    [setCursorCoordinates, setSuggestionPrefix],
  );
  let textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col relative">
      {cursorCoordinates && (
        <Autocomplete
          selected={suggestionIndex}
          suggestions={suggestions}
          {...cursorCoordinates}
          onClick={() => {}}
        />
      )}
      <AutosizeTextarea
        ref={textareaRef}
        onKeyDown={(e) => {
          if (!cursorCoordinates) return;
          switch (e.key) {
            case "ArrowUp": {
              if (suggestions.length > 0 && !!cursorCoordinates) {
                e.preventDefault();
                if (suggestionIndex > 0) setSuggestionIndex((i) => i - 1);
                break;
              }
              break;
            }
            case "ArrowDown": {
              if (suggestions.length > 0 && !!cursorCoordinates) {
                e.preventDefault();
                if (suggestionIndex < suggestions.length - 1)
                  setSuggestionIndex((i) => i + 1);
                break;
              }
              break;
            }
            case "Enter": {
              if (suggestions.length > 0 && !!cursorCoordinates) {
                e.preventDefault();
                let value = suggestions[suggestionIndex] || suggestions[0];
                if (!value) break;
                // TODO write the text!
                let start = e.currentTarget.selectionStart,
                  end = e.currentTarget.selectionEnd;
                if (!suggestionPrefix) break;
                let [newValue, cursors] = modifyString(
                  props.value,
                  [start, end],
                  (text) => {
                    if (!cursorCoordinates || !suggestionPrefix) return;
                    text.delete(
                      cursorCoordinates.textIndex,
                      suggestionPrefix.length,
                    );
                    text.insert(cursorCoordinates.textIndex, `@${value}`);
                  },
                );
                props.setValue(newValue);
                e.currentTarget.setSelectionRange(cursors[0], cursors[1]);
                close();
                break;
              }
            }
          }
        }}
        onSelect={onSelect}
        value={props.value}
        onChange={(e) => props.setValue(e.currentTarget.value.slice(0, 300))}
        placeholder="Write a post to share your writing!"
      />
    </div>
  );
};

const Autocomplete = (props: {
  top: number;
  left: number;
  selected: number;
  suggestions: string[];
  onClick: (item: string) => void;
}) => {
  if (props.suggestions.length === 0) return null;
  return (
    <Popover.Root open>
      {createPortal(
        <Popover.Anchor
          style={{
            top: props.top,
            left: props.left,
            position: "absolute",
          }}
        />,
        document.body,
      )}
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="center"
          sideOffset={4}
          collisionPadding={20}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="!z-[60] max-h-32 w-64 overflow-y-scroll rounded-md border border-grey-80 bg-white py-0 text-grey-35"
        >
          <ul className="list-none p-0 text-sm">
            {props.suggestions.map((result, index) => {
              return (
                <div
                  className={`${index === props.selected ? "bg-test" : ""} `}
                  key={result}
                  onClick={() => props.onClick(result)}
                >
                  {result}
                </div>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export const useSuggestions = () => {
  let [suggestionPrefix, setSuggestionPrefix] = useState<undefined | string>();
  let [suggestionIndex, setSuggestionIndex] = useState(0);
  let [suggestions, setSuggestions] = useState<string[]>([]);
  useDebouncedEffect(
    async () => {
      if (!suggestionPrefix) return setSuggestions([]);
      let agent = new Agent("https://public.api.bsky.app");
      let suggestions = await agent.searchActorsTypeahead({
        q: suggestionPrefix,
        limit: 8,
      });
      setSuggestions(suggestions.data.actors.map((actor) => actor.handle));
    },
    300,
    [suggestionPrefix],
  );

  useEffect(() => {
    if (suggestionIndex > suggestions.length - 1)
      setSuggestionIndex(suggestions.length - 1);
  }, [suggestionIndex, suggestions]);

  return {
    suggestions: suggestions,
    suggestionIndex,
    setSuggestionIndex,
    suggestionPrefix,
    close: () => setSuggestionPrefix(undefined),
    setSuggestionPrefix,
  };
};

function getLinkAtCursor(text: string, cursor: number) {
  let start: number | undefined;
  let end: number | undefined;
  // Iterate backward from cursor to find @
  for (let i = cursor - 1; i >= 0; i--) {
    if (text[i] === " ") {
      return undefined;
    }
    if (text[i] === "@") {
      start = i;
      break;
    }
  }

  if (start === undefined) return undefined;

  // Find end at first space after @
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === " ") {
      end = i;
      break;
    }
  }

  // If no space found, end is at text length
  if (end === undefined) {
    end = text.length;
  }

  if (!start || start < 0 || !end) return undefined;
  return {
    value: text.slice(start, end),
    start,
    end,
  };
}

type Transaction = (tx: {
  insert: (i: number, s: string) => void;
  delete: (i: number, l: number) => void;
}) => void;
function modifyString(
  input: string,
  initialCursor: number[],
  transact: Transaction,
): [string, number[]] {
  let output = input;
  let cursors = initialCursor;
  transact({
    insert: (i: number, s: string) => {
      output = output.slice(0, i) + s + output.slice(i);
      cursors = cursors.map((c) => {
        if (i < c) return c + s.length;
        return c;
      });
    },
    delete: (i: number, l: number) => {
      output = output.slice(0, i) + output.slice(i + l);
      cursors = cursors.map((c) => {
        if (i > c) return c - l;
        return c;
      });
    },
  });
  return [output, cursors];
}
