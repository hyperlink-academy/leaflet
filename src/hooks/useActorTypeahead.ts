import { Agent } from "@atproto/api";
import { useRef, useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";

type ActorSuggestion = {
  handle: string;
  did: string;
  displayName?: string;
  avatar?: string;
};

// Shared Bluesky actor typeahead state: a debounced search against the public
// AppView with a request-id guard so stale responses are dropped. Each consumer
// supplies its own trigger UI and submit handling. `transformQuery` lets a
// caller normalize the input (e.g. strip a leading @) before searching.
export function useActorTypeahead(opts?: {
  debounceMs?: number;
  transformQuery?: (value: string) => string;
}) {
  let [handleValue, setHandleValue] = useState("");
  let [suggestions, setSuggestions] = useState<ActorSuggestion[]>([]);
  let [dropdownOpen, setDropdownOpen] = useState(false);
  let [highlighted, setHighlighted] = useState<string | undefined>(undefined);
  let requestIdRef = useRef(0);

  useDebouncedEffect(
    async () => {
      let query = opts?.transformQuery
        ? opts.transformQuery(handleValue)
        : handleValue;
      if (!query) {
        setSuggestions([]);
        setDropdownOpen(false);
        return;
      }
      let requestId = ++requestIdRef.current;
      let agent = new Agent("https://public.api.bsky.app");
      try {
        let result = await agent.searchActorsTypeahead({ q: query, limit: 8 });
        if (requestId !== requestIdRef.current) return;
        let actors = result.data.actors.map((actor) => ({
          handle: actor.handle,
          did: actor.did,
          displayName: actor.displayName,
          avatar: actor.avatar,
        }));
        setSuggestions(actors);
        setDropdownOpen(actors.length > 0);
      } catch {
        setSuggestions([]);
        setDropdownOpen(false);
      }
    },
    opts?.debounceMs ?? 300,
    [handleValue],
  );

  return {
    handleValue,
    setHandleValue,
    suggestions,
    setSuggestions,
    dropdownOpen,
    setDropdownOpen,
    highlighted,
    setHighlighted,
  };
}
