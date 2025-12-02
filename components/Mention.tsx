"use client";
import { Agent } from "@atproto/api";
import { useState, useEffect, Fragment, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import * as Popover from "@radix-ui/react-popover";
import { EditorView } from "prosemirror-view";
import { callRPC } from "app/api/rpc/client";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { SearchTiny } from "components/Icons/SearchTiny";

export function MentionAutocomplete(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: React.RefObject<EditorView | null>;
  onSelect: (mention: Mention) => void;
  coords: { top: number; left: number } | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { suggestionIndex, setSuggestionIndex, suggestions, scope, setScope } =
    useMentionSuggestions(searchQuery);

  // Clear search when scope changes
  const handleScopeChange = useCallback(
    (newScope: MentionScope) => {
      setSearchQuery("");
      setSuggestionIndex(0);
      setScope(newScope);
    },
    [setScope, setSuggestionIndex],
  );

  // Focus input when opened
  useEffect(() => {
    if (props.open && inputRef.current) {
      // Small delay to ensure the popover is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [props.open]);

  // Reset state when closed
  useEffect(() => {
    if (!props.open) {
      setSearchQuery("");
      setScope({ type: "default" });
      setSuggestionIndex(0);
    }
  }, [props.open, setScope, setSuggestionIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      props.onOpenChange(false);
      props.view.current?.focus();
      return;
    }

    if (e.key === "Backspace" && searchQuery === "") {
      // Backspace at the start of input closes autocomplete and refocuses editor
      e.preventDefault();
      props.onOpenChange(false);
      props.view.current?.focus();
      return;
    }

    // Reverse arrow key direction when popover is rendered above
    const isReversed = contentRef.current?.dataset.side === "top";
    const upKey = isReversed ? "ArrowDown" : "ArrowUp";
    const downKey = isReversed ? "ArrowUp" : "ArrowDown";

    if (e.key === upKey) {
      e.preventDefault();
      if (suggestionIndex > 0) {
        setSuggestionIndex((i) => i - 1);
      }
    } else if (e.key === downKey) {
      e.preventDefault();
      if (suggestionIndex < suggestions.length - 1) {
        setSuggestionIndex((i) => i + 1);
      }
    } else if (e.key === "Tab") {
      const selectedSuggestion = suggestions[suggestionIndex];
      if (selectedSuggestion?.type === "publication") {
        e.preventDefault();
        handleScopeChange({
          type: "publication",
          uri: selectedSuggestion.uri,
          name: selectedSuggestion.name,
        });
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedSuggestion = suggestions[suggestionIndex];
      if (selectedSuggestion) {
        props.onSelect(selectedSuggestion);
        props.onOpenChange(false);
      }
    } else if (
      e.key === " " &&
      searchQuery === "" &&
      scope.type === "default"
    ) {
      // Space immediately after opening closes the autocomplete
      e.preventDefault();
      props.onOpenChange(false);
      // Insert a space after the @ in the editor
      if (props.view.current) {
        const view = props.view.current;
        const tr = view.state.tr.insertText(" ");
        view.dispatch(tr);
        view.focus();
      }
    }
  };

  if (!props.open || !props.coords) return null;

  const getHeader = (type: Mention["type"]) => {
    switch (type) {
      case "did":
        return "People";
      case "publication":
        return "Publications";
      case "post":
        return "Posts";
    }
  };

  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const order: Mention["type"][] = ["did", "publication", "post"];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  return (
    <Popover.Root open>
      {createPortal(
        <Popover.Anchor
          style={{
            top: props.coords.top - 24,
            left: props.coords.left,
            height: 24,
            position: "absolute",
          }}
        />,
        document.body,
      )}
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          align="start"
          sideOffset={4}
          collisionPadding={20}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={`dropdownMenu group/mention-menu z-20 bg-bg-page
            flex  data-[side=top]:flex-col-reverse flex-col
            p-1 gap-1
            border border-border rounded-md shadow-md
            sm:max-w-xs w-[1000px] max-w-(--radix-popover-content-available-width)
          max-h-(--radix-popover-content-available-height)
          overflow-y-scroll`}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-2 py-1 border-b group-data-[side=top]/mention-menu:border-b-0 group-data-[side=top]/mention-menu:border-t border-border-light">
            {scope.type === "publication" && (
              <button
                className="p-1 rounded hover:bg-accent-light text-tertiary hover:text-accent-contrast shrink-0"
                onClick={() => handleScopeChange({ type: "default" })}
                onMouseDown={(e) => e.preventDefault()}
              >
                <GoBackSmall className="w-4 h-4" />
              </button>
            )}
            {scope.type === "publication" && (
              <span className="text-sm font-bold text-secondary truncate shrink-0 max-w-[100px]">
                {scope.name}
              </span>
            )}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <SearchTiny className="w-4 h-4 text-tertiary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSuggestionIndex(0);
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder={
                  scope.type === "publication"
                    ? "Search posts..."
                    : "Search people & publications..."
                }
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm placeholder:text-tertiary"
              />
            </div>
          </div>
          {sortedSuggestions.length === 0 ? (
            <div className="text-sm text-tertiary italic px-3 py-2">
              {searchQuery
                ? "No results found"
                : scope.type === "publication"
                  ? "Type to search posts"
                  : "Type to search"}
            </div>
          ) : (
            <ul className="list-none p-0 text-sm flex flex-col group-data-[side=top]/mention-menu:flex-col-reverse">
              {sortedSuggestions.map((result, index) => {
                const prevResult = sortedSuggestions[index - 1];
                const showHeader =
                  prevResult && prevResult.type !== result.type;

                return (
                  <Fragment
                    key={result.type === "did" ? result.did : result.uri}
                  >
                    {showHeader && (
                      <>
                        {index > 0 && (
                          <hr className="border-border-light mx-1 my-1" />
                        )}
                        <div className="text-xs text-tertiary font-bold pt-1 px-2">
                          {getHeader(result.type)}
                        </div>
                      </>
                    )}
                    {result.type === "did" ? (
                      <DidResult
                        onClick={() => {
                          props.onSelect(result);
                          props.onOpenChange(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        displayName={result.displayName}
                        handle={result.handle}
                        selected={index === suggestionIndex}
                      />
                    ) : result.type === "publication" ? (
                      <PublicationResult
                        onClick={() => {
                          props.onSelect(result);
                          props.onOpenChange(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        pubName={result.name}
                        selected={index === suggestionIndex}
                        onPostsClick={() => {
                          handleScopeChange({
                            type: "publication",
                            uri: result.uri,
                            name: result.name,
                          });
                        }}
                      />
                    ) : (
                      <PostResult
                        onClick={() => {
                          props.onSelect(result);
                          props.onOpenChange(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        title={result.title}
                        selected={index === suggestionIndex}
                      />
                    )}
                  </Fragment>
                );
              })}
            </ul>
          )}
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
    <button
      className={`
        menuItem  w-full flex-col! gap-0!
        text-secondary leading-snug text-sm
      ${props.subtext ? "py-1!" : "py-2!"}
        ${props.selected ? "bg-[var(--accent-light)]!" : ""}`}
      onClick={() => {
        props.onClick();
      }}
      onMouseDown={(e) => props.onMouseDown(e)}
    >
      <div
        className={`flex gap-2 items-center w-full truncate justify-between`}
      >
        {props.result}
      </div>
      {props.subtext && (
        <div className="text-tertiary italic text-xs font-normal min-w-0 truncate pb-[1px]">
          {props.subtext}
        </div>
      )}
    </button>
  );
};

const ScopeButton = (props: {
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <span
      className="flex flex-row shrink-0 text-xs font-normal text-tertiary hover:text-accent-contrast cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onClick();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {props.children} <ArrowRightTiny className="scale-80" />
    </span>
  );
};

const DidResult = (props: {
  displayName?: string;
  handle: string;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
}) => {
  return (
    <Result
      result={props.displayName ? props.displayName : props.handle}
      subtext={props.displayName && `@${props.handle}`}
      {...props}
    />
  );
};

const PublicationResult = (props: {
  pubName: string;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
  onPostsClick: () => void;
}) => {
  return (
    <Result
      result={
        <>
          <div className="truncate w-full grow min-w-0">{props.pubName}</div>
          <ScopeButton onClick={props.onPostsClick}>Posts</ScopeButton>
        </>
      }
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
      selected={props.selected}
    />
  );
};

const PostResult = (props: {
  title: string;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
}) => {
  return (
    <Result
      result={<div className="truncate w-full">{props.title}</div>}
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
      selected={props.selected}
    />
  );
};

export type Mention =
  | { type: "did"; handle: string; did: string; displayName?: string }
  | { type: "publication"; uri: string; name: string }
  | { type: "post"; uri: string; title: string };

export type MentionScope =
  | { type: "default" }
  | { type: "publication"; uri: string; name: string };
function useMentionSuggestions(query: string | null) {
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<Mention>>([]);
  const [scope, setScope] = useState<MentionScope>({ type: "default" });

  useDebouncedEffect(
    async () => {
      if (!query && scope.type === "default") {
        setSuggestions([]);
        return;
      }

      if (scope.type === "publication") {
        // Search within the publication's documents
        const documents = await callRPC(`search_publication_documents`, {
          publication_uri: scope.uri,
          query: query || "",
          limit: 10,
        });
        setSuggestions(
          documents.result.documents.map((d) => ({
            type: "post" as const,
            uri: d.uri,
            title: d.title,
          })),
        );
      } else {
        // Default scope: search people and publications
        const agent = new Agent("https://public.api.bsky.app");
        const [result, publications] = await Promise.all([
          agent.searchActorsTypeahead({
            q: query || "",
            limit: 8,
          }),
          callRPC(`search_publication_names`, { query: query || "", limit: 8 }),
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
      }
    },
    300,
    [query, scope],
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
    scope,
    setScope,
  };
}
