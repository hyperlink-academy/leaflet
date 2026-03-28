"use client";
import { Agent } from "@atproto/api";
import {
  useState,
  useEffect,
  useMemo,
  Fragment,
  useRef,
  useCallback,
} from "react";
import useSWR from "swr";
import * as Popover from "@radix-ui/react-popover";
import { EditorView } from "prosemirror-view";
import { callRPC } from "app/api/rpc/client";
import type * as SearchService from "lexicons/api/types/parts/page/mention/search";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { GoBackSmall } from "components/Icons/GoBackSmall";
import { SearchTiny } from "components/Icons/SearchTiny";
import { CloseTiny } from "./Icons/CloseTiny";
import { GoToArrow } from "./Icons/GoToArrow";
import { GoBackTiny } from "./Icons/GoBackTiny";

export function MentionAutocomplete(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: React.RefObject<EditorView | null>;
  onSelect: (mention: Mention) => void;
  onEmbed?: (mention: Mention & { type: "service_result" }) => void;
  coords: { top: number; left: number } | null;
  placeholder?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { suggestionIndex, setSuggestionIndex, suggestions, scope, setScope, searchComplete } =
    useMentionSuggestions(searchQuery, props.open);

  const noResults = searchComplete && searchQuery !== "" && suggestions.length === 0;

  const sortedSuggestions = useMemo(() => {
    const order: Mention["type"][] = [
      "did",
      "publication",
      "post",
      "service",
      "service_result",
    ];
    return [...suggestions].sort(
      (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
    );
  }, [suggestions]);

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
      if (suggestionIndex < sortedSuggestions.length - 1) {
        setSuggestionIndex((i) => i + 1);
      }
    } else if (e.key === "Tab") {
      const selectedSuggestion = sortedSuggestions[suggestionIndex];
      if (selectedSuggestion?.type === "publication") {
        e.preventDefault();
        handleScopeChange({
          type: "publication",
          uri: selectedSuggestion.uri,
          name: selectedSuggestion.name,
        });
      } else if (selectedSuggestion?.type === "service") {
        e.preventDefault();
        handleScopeChange(serviceScopeFromMention(selectedSuggestion));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedSuggestion = sortedSuggestions[suggestionIndex];
      if (selectedSuggestion?.type === "service") {
        handleScopeChange(serviceScopeFromMention(selectedSuggestion));
      } else if (
        (e.ctrlKey || e.metaKey) &&
        selectedSuggestion?.type === "service_result" &&
        selectedSuggestion.embed &&
        props.onEmbed
      ) {
        props.onEmbed(selectedSuggestion);
        props.onOpenChange(false);
      } else if (selectedSuggestion) {
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

  const getHeader = (type: Mention["type"], scope?: MentionScope) => {
    // When in a built-in scope, show a back header
    if (
      scope?.type === "identities" ||
      scope?.type === "publications" ||
      scope?.type === "publication" ||
      scope?.type === "service"
    ) {
      return (
        <ScopeHeader
          scope={scope}
          handleScopeChange={() => {
            handleScopeChange({ type: "default" });
          }}
        />
      );
    }
    switch (type) {
      case "did":
        return "People";
      case "publication":
        return "Publications";
      case "post":
        return "Posts";
      case "service":
        return "Services";
      case "service_result":
        return null;
    }
  };

  return (
    <Popover.Root open>
      <Popover.Anchor
        style={{
          top: props.coords.top - 24,
          left: props.coords.left,
          height: 24,
          position: "absolute",
        }}
      />
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          align="start"
          sideOffset={4}
          collisionPadding={32}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={`dropdownMenu group/mention-menu z-20 bg-bg-page
            flex  data-[side=top]:flex-col-reverse flex-col
            p-1 gap-1 text-primary
            border border-border rounded-md shadow-md
            sm:max-w-xs w-[1000px] max-w-(--radix-popover-content-available-width)
          max-h-(--radix-popover-content-available-height)
          overflow-hidden`}
        >
          {/* Dropdown Header - sticky */}
          <div className="flex flex-col items-center gap-2 px-2 py-1 border-b group-data-[side=top]/mention-menu:border-b-0 group-data-[side=top]/mention-menu:border-t border-border-light bg-bg-page sticky top-0 group-data-[side=top]/mention-menu:sticky group-data-[side=top]/mention-menu:bottom-0 group-data-[side=top]/mention-menu:top-auto z-10 shrink-0">
            <div className="flex items-center gap-1 flex-1 min-w-0 text-primary">
              <div className="text-tertiary">
                <SearchTiny className="w-4 h-4 shrink-0" />
              </div>
              <input
                ref={inputRef}
                size={100}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSuggestionIndex(0);
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder={
                  scopePlaceholder(scope, props.placeholder)
                }
                className="flex-1 w-full min-w-0 bg-transparent border-none outline-none text-sm placeholder:text-tertiary"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            {sortedSuggestions.length === 0 && noResults && (
              <div className="text-sm text-tertiary italic px-3 py-1 text-center">
                No results found
              </div>
            )}
            <ul className="list-none p-0 text-sm flex flex-col group-data-[side=top]/mention-menu:flex-col-reverse">
              {sortedSuggestions.map((result, index) => {
                const prevResult = sortedSuggestions[index - 1];
                const showHeader =
                  index === 0 ||
                  (prevResult && prevResult.type !== result.type);

                const key =
                  result.type === "did"
                    ? result.did
                    : result.type === "service"
                      ? result.serviceUri
                      : result.uri;

                return (
                  <Fragment key={key}>
                    {showHeader && (
                      <>
                        {index > 0 && (
                          <hr className="border-border-light mx-1 my-1" />
                        )}
                        <div className="text-xs text-tertiary font-bold pt-1 px-2">
                          {getHeader(result.type, scope)}
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
                        avatar={result.avatar}
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
                        uri={result.uri}
                        selected={index === suggestionIndex}
                        onPostsClick={() => {
                          handleScopeChange({
                            type: "publication",
                            uri: result.uri,
                            name: result.name,
                          });
                        }}
                      />
                    ) : result.type === "service" ? (
                      <ServiceEntry
                        onClick={() => {
                          handleScopeChange(serviceScopeFromMention(result));
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        name={result.name}
                        description={result.description}
                        selected={index === suggestionIndex}
                      />
                    ) : result.type === "service_result" ? (
                      <ServiceSearchResult
                        onClick={() => {
                          props.onSelect(result);
                          props.onOpenChange(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        name={result.name}
                        icon={result.icon}
                        hasEmbed={!!result.embed}
                        onEmbedClick={
                          result.embed && props.onEmbed
                            ? () => {
                                props.onEmbed!(result);
                                props.onOpenChange(false);
                              }
                            : undefined
                        }
                        selected={index === suggestionIndex}
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
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const Result = (props: {
  result: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
}) => {
  return (
    <button
      className={`
        menuItem  w-full flex-row! gap-2!
        text-secondary leading-snug text-sm
      ${props.subtext ? "py-1!" : "py-2!"}
        ${props.selected ? "bg-[var(--accent-light)]!" : ""}`}
      onClick={() => {
        props.onClick();
      }}
      onMouseDown={(e) => props.onMouseDown(e)}
    >
      {props.icon}
      <div className="flex flex-col min-w-0 flex-1">
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
      </div>
    </button>
  );
};

const ScopeButton = (props: {
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <span
      className="flex flex-row items-center h-full shrink-0 text-xs font-normal text-tertiary hover:text-accent-contrast cursor-pointer"
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
  avatar?: string;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
}) => {
  return (
    <Result
      icon={
        props.avatar ? (
          <img
            src={props.avatar}
            alt=""
            className="w-5 h-5 rounded-full shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-border shrink-0" />
        )
      }
      result={props.displayName ? props.displayName : props.handle}
      subtext={props.displayName && `@${props.handle}`}
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
      selected={props.selected}
    />
  );
};

const PublicationResult = (props: {
  pubName: string;
  uri: string;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
  onPostsClick: () => void;
}) => {
  return (
    <Result
      icon={
        <img
          src={`/api/pub_icon?at_uri=${encodeURIComponent(props.uri)}`}
          alt=""
          className="w-5 h-5 rounded-full shrink-0"
        />
      }
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

const ServiceEntry = (props: {
  name: string;
  description?: string;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
}) => {
  return (
    <Result
      result={
        <>
          <div className="truncate w-full grow min-w-0">{props.name}</div>
          <ScopeButton onClick={props.onClick}>Search</ScopeButton>
        </>
      }
      subtext={props.description}
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
      selected={props.selected}
    />
  );
};

const ServiceSearchResult = (props: {
  name: string;
  icon?: string;
  hasEmbed?: boolean;
  onEmbedClick?: () => void;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  selected?: boolean;
}) => {
  return (
    <Result
      icon={
        props.icon ? (
          <img
            src={props.icon}
            alt=""
            className="w-5 h-5 rounded-full shrink-0"
          />
        ) : undefined
      }
      result={
        props.hasEmbed && props.onEmbedClick ? (
          <>
            <div className="truncate w-full grow min-w-0">{props.name}</div>
            <ScopeButton onClick={props.onEmbedClick}>Embed</ScopeButton>
          </>
        ) : (
          <div className="truncate w-full">{props.name}</div>
        )
      }
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
      selected={props.selected}
    />
  );
};

const ScopeHeader = (props: {
  scope: MentionScope;
  handleScopeChange: () => void;
}) => {
  if (props.scope.type === "default") return;

  const label =
    props.scope.type === "identities"
      ? "People"
      : props.scope.type === "publications"
        ? "Publications"
        : props.scope.type === "publication"
          ? `Posts from ${props.scope.name}`
          : `Results from ${props.scope.name}`;

  return (
    <button
      className="w-full flex flex-row gap-2 pt-1 rounded text-tertiary hover:text-accent-contrast shrink-0 text-xs"
      onClick={() => props.handleScopeChange()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <GoBackTiny className="shrink-0 " />
      <div className="grow w-full truncate text-left">{label}</div>
    </button>
    );
};

export type Mention =
  | {
      type: "did";
      handle: string;
      did: string;
      displayName?: string;
      avatar?: string;
    }
  | { type: "publication"; uri: string; name: string; url: string }
  | { type: "post"; uri: string; title: string; url: string }
  | {
      type: "service";
      serviceUri: string;
      name: string;
      description?: string;
    }
  | {
      type: "service_result";
      uri: string;
      name: string;
      href?: string;
      icon?: string;
      embed?: SearchService.EmbedInfo;
    };

export type MentionScope =
  | { type: "default" }
  | { type: "identities" }
  | { type: "publications" }
  | { type: "publication"; uri: string; name: string }
  | { type: "service"; serviceUri: string; name: string };

function scopePlaceholder(scope: MentionScope, fallback?: string): string {
  switch (scope.type) {
    case "identities": return "Search people...";
    case "publications": return "Search publications...";
    case "publication": return "Search posts...";
    case "service": return `Search ${scope.name}...`;
    default: return fallback ?? "Search people & publications...";
  }
}

function serviceScopeFromMention(service: Mention & { type: "service" }): MentionScope {
  if (service.serviceUri === BUILTIN_IDENTITIES.serviceUri) return { type: "identities" };
  if (service.serviceUri === BUILTIN_PUBLICATIONS.serviceUri) return { type: "publications" };
  return { type: "service", serviceUri: service.serviceUri, name: service.name };
}

const BUILTIN_IDENTITIES: Mention & { type: "service" } = {
  type: "service",
  serviceUri: "builtin:identities",
  name: "Identities",
  description: "Search people on Bluesky",
};
const BUILTIN_PUBLICATIONS: Mention & { type: "service" } = {
  type: "service",
  serviceUri: "builtin:publications",
  name: "Publications",
  description: "Search publications on Leaflet",
};

const bskyAgent = new Agent("https://public.api.bsky.app");

async function searchIdentities(
  query: string,
  limit: number,
): Promise<Mention[]> {
  const result = await bskyAgent.searchActorsTypeahead({ q: query, limit });
  return result.data.actors.map((actor) => ({
    type: "did" as const,
    handle: actor.handle,
    did: actor.did,
    displayName: actor.displayName,
    avatar: actor.avatar,
  }));
}

async function searchPublications(
  query: string,
  limit: number,
): Promise<Mention[]> {
  const publications = await callRPC(`search_publication_names`, {
    query,
    limit,
  });
  return publications.result.publications.map((p) => ({
    type: "publication" as const,
    uri: p.uri,
    name: p.name,
    url: p.url,
  }));
}

const EMPTY_SERVICES: Array<Mention> = [];
function useMentionServices(enabled: boolean): Array<Mention> {
  const { data } = useSWR(
    enabled ? "mention_services" : null,
    async () => {
      try {
        const result = await callRPC(`get_user_mention_services`, {});
        return result.result.services.map(
          (s: { uri: string; name: string; description?: string }) => ({
            type: "service" as const,
            serviceUri: s.uri,
            name: s.name,
            description: s.description,
          }),
        );
      } catch {
        return EMPTY_SERVICES;
      }
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  return data || EMPTY_SERVICES;
}

function useMentionSuggestions(query: string | null, open: boolean) {
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<Mention>>([]);
  const [scope, setScope] = useState<MentionScope>({ type: "default" });
  const [searchComplete, setSearchComplete] = useState(false);
  const externalServices = useMentionServices(open);
  const allServices = useMemo(
    () =>
      externalServices.length > 0
        ? [BUILTIN_IDENTITIES, BUILTIN_PUBLICATIONS, ...externalServices]
        : EMPTY_SERVICES,
    [externalServices],
  );
  const hasServices = allServices.length > 0;

  // Clear suggestions immediately when scope changes
  const setScopeAndClear = useCallback((newScope: MentionScope) => {
    setSuggestions([]);
    setScope(newScope);
  }, []);

  useEffect(() => {
    let stale = false;
    setSearchComplete(false);
    // Default scope with services: show local filter instantly, debounce network fallback
    if (hasServices && scope.type === "default") {
      const filtered = allServices.filter((s) =>
        s.type === "service"
          ? s.name.toLowerCase().includes((query || "").toLowerCase())
          : true,
      );
      setSuggestions(filtered);
      setSearchComplete(true);

      // If local filter found matches, no need for network search
      if (!query || filtered.length > 0) return;
      setSearchComplete(false);
    }

    const handler = setTimeout(async () => {
      if (stale || !open) return;

      let results: Array<Mention>;

      if (scope.type === "identities") {
        results = await searchIdentities(query || "", 10);
      } else if (scope.type === "publications") {
        results = await searchPublications(query || "", 10);
      } else if (scope.type === "publication") {
        // Search within a specific publication's documents
        const documents = await callRPC(`search_publication_documents`, {
          publication_uri: scope.uri,
          query: query || "",
          limit: 10,
        });
        results = (documents?.result?.documents ?? []).map((d) => ({
          type: "post" as const,
          uri: d.uri,
          title: d.title,
          url: d.url,
        }));
      } else if (scope.type === "service") {
        // Search within a mention service
        if (!query) {
          if (!stale) {
            setSuggestions([]);
            setSearchComplete(true);
          }
          return;
        }
        const res = await callRPC(`proxy_mention_search`, {
          service_uri: scope.serviceUri,
          search: query,
        });
        const items: SearchService.Result[] = res?.result?.results ?? [];
        results = items.map((r) => ({
          type: "service_result" as const,
          uri: r.uri,
          name: r.name,
          href: r.href,
          icon: r.icon,
          embed: r.embed,
        }));
      } else if (hasServices) {
        // Default scope with services: local filter showed no matches, fall back to identity search
        results = await searchIdentities(query || "", 10);
      } else {
        // Default scope, no services: search people & publications together
        const [identities, publications] = await Promise.all([
          searchIdentities(query || "", 8),
          searchPublications(query || "", 8),
        ]);
        results = [...identities, ...publications];
      }

      if (!stale) {
        setSuggestions(results);
        setSearchComplete(true);
      }
    }, 300);

    return () => {
      stale = true;
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scope, open, hasServices, allServices]);

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
    setScope: setScopeAndClear,
    searchComplete,
  };
}
