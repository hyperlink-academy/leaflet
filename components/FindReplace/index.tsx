"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Replicache } from "replicache";

import { Input } from "components/Input";
import { ToolbarButton } from "components/Toolbar";
import { useToaster } from "components/Toast";
import { useEntitySetContext } from "components/EntitySetProvider";
import { ArrowDownTiny } from "components/Icons/ArrowDownTiny";
import { CaseSensitiveTiny } from "components/Icons/CaseSensitiveTiny";
import { CloseTiny } from "components/Icons/CloseTiny";
import { WholeWordTiny } from "components/Icons/WholeWordTiny";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { useReplicache, type ReplicacheMutators } from "src/replicache";
import { addShortcut } from "src/shortcuts";
import { useEditorStates } from "src/state/useEditorState";
import { UndoManager } from "src/undoManager";
import { useUIState } from "src/useUIState";
import { elementId } from "src/utils/elementId";
import { scrollIntoViewIfNeeded } from "src/utils/scrollIntoViewIfNeeded";

import {
  collectMatches,
  pageContainerId,
  revealFoldedMatches,
  sameMatches,
  type Match,
} from "./findMatches";
import { applyReplacements } from "./replace";
import {
  hasSearchHighlights,
  retireSearchHighlightSession,
  searchHighlightKey,
} from "./searchHighlightPlugin";
import {
  closeFindReplace,
  openFindReplace,
  searchOptions,
  useFindReplaceStore,
} from "./store";

const RECOMPUTE_DEBOUNCE_MS = 120;

const PANEL_TOOLTIP_Z = "z-[45]";

type MatchState = { matches: Match[]; currentIndex: number | null };

export function FindReplace() {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let toaster = useToaster();
  let open = useFindReplaceStore((s) => s.open);
  let canWrite = entity_set.permissions.write;

  useEffect(() => {
    if (!canWrite) return;
    return addShortcut({
      metaKey: true,
      key: ["f", "F"],
      handler: () => openFindReplace(selectedTextAsQuery()),
    });
  }, [canWrite]);

  if (!canWrite || !open) return null;
  return (
    <FindReplacePanel rep={rep} undoManager={undoManager} toaster={toaster} />
  );
}

function FindReplacePanel(props: {
  rep: Replicache<ReplicacheMutators> | null;
  undoManager: UndoManager;
  toaster: ReturnType<typeof useToaster>;
}) {
  let { rep, undoManager, toaster } = props;
  let query = useFindReplaceStore((s) => s.query);
  let replacement = useFindReplaceStore((s) => s.replacement);
  let caseSensitive = useFindReplaceStore((s) => s.caseSensitive);
  let wholeWord = useFindReplaceStore((s) => s.wholeWord);
  let focusSeq = useFindReplaceStore((s) => s.focusSeq);
  let [matchState, setMatchStateRaw] = useState<MatchState>({
    matches: [],
    currentIndex: null,
  });
  let matchStateRef = useRef(matchState);
  let setMatchState = useCallback(
    (updater: (prev: MatchState) => MatchState) => {
      matchStateRef.current = updater(matchStateRef.current);
      setMatchStateRaw(matchStateRef.current);
    },
    [],
  );
  let { matches, currentIndex } = matchState;
  let panel = useRef<HTMLDivElement | null>(null);
  let placement = usePanelPlacement(panel);
  let focusInput = useCallback((attribute: string) => {
    let input = panel.current?.querySelector<HTMLInputElement>(
      `input[${attribute}]`,
    );
    input?.focus();
    input?.select();
  }, []);

  let recompute = useCallback(
    (resetIndex: boolean) => {
      let state = useFindReplaceStore.getState();
      let found = collectMatches(state.query, searchOptions(state));
      let prev = matchStateRef.current;
      if (
        !resetIndex &&
        sameMatches(prev.matches, found) &&
        (found.length === 0) === (prev.currentIndex === null)
      )
        return found;
      setMatchState((p) => ({
        matches: found,
        currentIndex:
          found.length === 0
            ? null
            : resetIndex || p.currentIndex === null
              ? 0
              : Math.min(p.currentIndex, found.length - 1),
      }));
      return found;
    },
    [setMatchState],
  );

  useEffect(() => {
    let timeout: number | null = null;
    let unsubscribe = useEditorStates.subscribe(
      (s) => s.editorStates,
      () => {
        if (pushingHighlights) return;
        if (timeout) window.clearTimeout(timeout);
        timeout = window.setTimeout(
          () => recompute(false),
          RECOMPUTE_DEBOUNCE_MS,
        );
      },
    );
    return () => {
      if (timeout) window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [recompute]);

  useEffect(() => {
    focusInput("data-find-query");
  }, [focusSeq, focusInput]);

  useEffect(() => addShortcut({ key: "Escape", handler: closeFindReplace }), []);

  let runSearch = useCallback(
    async (isCancelled: () => boolean) => {
      let found = recompute(true);
      if (found.length > 0) scrollToMatch(found[0]);
      if (!rep) return;
      let state = useFindReplaceStore.getState();
      let expanded = await revealFoldedMatches(
        rep,
        state.query,
        searchOptions(state),
      );
      if (!expanded || isCancelled()) return;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (isCancelled()) return;
          let revealed = recompute(true);
          if (revealed.length > 0) scrollToMatch(revealed[0]);
        }),
      );
    },
    [rep, recompute],
  );

  useDebouncedEffect(runSearch, RECOMPUTE_DEBOUNCE_MS, [query, runSearch]);
  useEffect(() => {
    let cancelled = false;
    runSearch(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [caseSensitive, wholeWord, runSearch]);

  useEffect(() => {
    pushHighlights(matches, currentIndex);
  }, [matches, currentIndex]);

  useEffect(() => {
    return () => {
      retireSearchHighlightSession();
      pushHighlights([], null);
    };
  }, []);

  let go = useCallback(
    (delta: 1 | -1) => {
      let from = matchStateRef.current.currentIndex;
      let found = recompute(false);
      if (found.length === 0) return;
      let next =
        from === null
          ? delta === 1
            ? 0
            : found.length - 1
          : (Math.min(from, found.length - 1) + delta + found.length) %
            found.length;
      setMatchState((p) => ({ ...p, currentIndex: next }));
      scrollToMatch(found[next]);
    },
    [recompute, setMatchState],
  );

  let replaceCurrent = useCallback(() => {
    let found = recompute(false);
    let index = matchStateRef.current.currentIndex;
    if (found.length === 0 || index === null) return;
    let target = found[index];
    applyReplacements([target], replacement, undoManager);
    let insertedEnd = target.from + replacement.length;
    requestAnimationFrame(() => {
      let after = recompute(false);
      if (after.length === 0) return;
      let next = index;
      while (
        next < after.length &&
        after[next].blockID === target.blockID &&
        after[next].from >= target.from &&
        after[next].from < insertedEnd
      )
        next++;
      if (next >= after.length) next = 0;
      setMatchState((p) => ({ ...p, currentIndex: next }));
      scrollToMatch(after[next]);
    });
  }, [recompute, replacement, undoManager, setMatchState]);

  let replaceAll = useCallback(async () => {
    if (rep) {
      let state = useFindReplaceStore.getState();
      let expanded = await revealFoldedMatches(
        rep,
        state.query,
        searchOptions(state),
      );
      if (expanded)
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
    }
    let found = recompute(false);
    if (found.length === 0) return;
    let count = applyReplacements(found, replacement, undoManager);
    toaster({
      content: `Replaced ${count} instance${count === 1 ? "" : "s"}`,
      type: "success",
    });
    requestAnimationFrame(() => recompute(true));
  }, [rep, recompute, replacement, undoManager, toaster]);

  let onQueryKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      return focusInput("data-find-replacement");
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    go(e.shiftKey ? -1 : 1);
  };

  let onReplacementKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      return focusInput("data-find-query");
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    replaceCurrent();
  };

  let counter =
    query === ""
      ? ""
      : matches.length === 0
        ? "No results"
        : `${(currentIndex ?? 0) + 1}/${matches.length}`;

  return (
    <div
      ref={panel}
      className="findReplace fixed z-40 w-[340px] max-w-[calc(100vw_-_24px)] flex flex-col gap-2 p-2 bg-bg-page border border-border rounded-lg shadow-md"
      style={
        placement.beside
          ? { top: placement.top, left: placement.left }
          : {
              bottom: placement.bottom,
              left: "50%",
              transform: "translateX(-50%)",
            }
      }
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) e.preventDefault();
      }}
    >
      <div className="flex gap-1 items-center">
        <div className="input-with-border grow min-w-0 flex gap-1 items-center py-1! px-[6px]!">
          <Input
            data-find-query
            autoFocus
            value={query}
            placeholder="Find"
            onKeyDown={onQueryKeyDown}
            onChange={(e) =>
              useFindReplaceStore.setState({ query: e.currentTarget.value })
            }
            className="grow bg-transparent outline-hidden text-base text-primary min-w-0"
          />
          <span className="text-sm text-tertiary shrink-0 whitespace-nowrap">
            {counter}
          </span>
        </div>
        <ToolbarButton
          tooltipContent="Match case"
          active={caseSensitive}
          tooltipClassName={PANEL_TOOLTIP_Z}
          className="p-1 shrink-0"
          onClick={() =>
            useFindReplaceStore.setState((s) => ({
              caseSensitive: !s.caseSensitive,
            }))
          }
        >
          <CaseSensitiveTiny />
        </ToolbarButton>
        <ToolbarButton
          tooltipContent="Whole word"
          active={wholeWord}
          tooltipClassName={PANEL_TOOLTIP_Z}
          className="p-1 shrink-0"
          onClick={() =>
            useFindReplaceStore.setState((s) => ({ wholeWord: !s.wholeWord }))
          }
        >
          <WholeWordTiny />
        </ToolbarButton>
      </div>

      <div className="flex gap-1 items-center">
        <Input
          data-find-replacement
          value={replacement}
          placeholder="Replace with"
          onKeyDown={onReplacementKeyDown}
          onChange={(e) =>
            useFindReplaceStore.setState({
              replacement: e.currentTarget.value,
            })
          }
          className="input-with-border grow min-w-0 py-1! px-[6px]! bg-transparent outline-hidden text-base text-primary"
        />
        <ToolbarButton
          tooltipContent="Previous match"
          tooltipClassName={PANEL_TOOLTIP_Z}
          className="p-1 shrink-0"
          disabled={matches.length === 0}
          onClick={() => go(-1)}
        >
          <ArrowDownTiny className="rotate-180" />
        </ToolbarButton>
        <ToolbarButton
          tooltipContent="Next match"
          tooltipClassName={PANEL_TOOLTIP_Z}
          className="p-1 shrink-0"
          disabled={matches.length === 0}
          onClick={() => go(1)}
        >
          <ArrowDownTiny />
        </ToolbarButton>
        <ToolbarButton
          tooltipContent="Close"
          tooltipClassName={PANEL_TOOLTIP_Z}
          className="p-1 shrink-0"
          onClick={() => closeFindReplace()}
        >
          <CloseTiny />
        </ToolbarButton>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          className="text-sm font-bold text-accent-contrast disabled:text-border"
          disabled={matches.length === 0}
          onMouseDown={(e) => e.preventDefault()}
          onClick={replaceCurrent}
        >
          Replace
        </button>
        <button
          className="text-sm font-bold text-accent-contrast disabled:text-border"
          disabled={matches.length === 0}
          onMouseDown={(e) => e.preventDefault()}
          onClick={replaceAll}
        >
          Replace all
        </button>
      </div>
    </div>
  );
}

const FALLBACK_GUTTER = 12;
const VIEWPORT_GUTTER = 8;

type PanelPlacement =
  | { beside: true; top: number; left: number }
  | { beside: false; bottom: number };

function usePanelPlacement(panelRef: RefObject<HTMLDivElement | null>) {
  let openPages = useUIState((s) => s.openPages);
  let focusedEntity = useUIState((s) => s.focusedEntity?.entityID);
  let [placement, setPlacement] = useState<PanelPlacement>({
    beside: false,
    bottom: FALLBACK_GUTTER,
  });
  useLayoutEffect(() => {
    let frame = 0;
    let dockToBottom = () => {
      let footer = document.querySelector(".leafletFooter");
      setPlacement({
        beside: false,
        bottom: footer
          ? window.innerHeight -
            footer.getBoundingClientRect().top +
            VIEWPORT_GUTTER
          : FALLBACK_GUTTER,
      });
    };
    let measure = () => {
      frame = 0;
      let pages = document.querySelectorAll(pageContainerId.selector);
      let first = pages[0];
      let last = pages[pages.length - 1];
      if (!first || !last) return dockToBottom();
      let firstRect = first.getBoundingClientRect();
      let lastRect = last.getBoundingClientRect();
      let sidebar = document.querySelector(".sidebarContainer .actionSidebar");
      let gutter = sidebar
        ? Math.max(0, firstRect.left - sidebar.getBoundingClientRect().right)
        : FALLBACK_GUTTER;
      let width = panelRef.current?.offsetWidth ?? 0;
      let left = Math.min(
        lastRect.right + gutter,
        window.innerWidth - width - VIEWPORT_GUTTER,
      );
      if (left < lastRect.right) return dockToBottom();
      setPlacement({ beside: true, top: lastRect.top, left });
    };
    let schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [openPages, focusedEntity, panelRef]);
  return placement;
}

let pushingHighlights = false;

function pushHighlights(matches: Match[], currentIndex: number | null) {
  let editorStates = useEditorStates.getState().editorStates;
  let grouped = new Map<
    string,
    { ranges: { from: number; to: number }[]; current: number | null }
  >();
  matches.forEach((match, i) => {
    let group = grouped.get(match.blockID);
    if (!group) {
      group = { ranges: [], current: null };
      grouped.set(match.blockID, group);
    }
    if (i === currentIndex) group.current = group.ranges.length;
    group.ranges.push({ from: match.from, to: match.to });
  });

  pushingHighlights = true;
  try {
    for (let blockID in editorStates) {
      let view = editorStates[blockID]?.view;
      if (!view) continue;
      let highlight = grouped.get(blockID);
      if (!highlight && !hasSearchHighlights(view.state)) continue;
      view.dispatch(
        view.state.tr.setMeta(searchHighlightKey, highlight ?? null),
      );
    }
  } finally {
    pushingHighlights = false;
  }
}

function scrollToMatch(match: Match) {
  scrollIntoViewIfNeeded(
    document.getElementById(elementId.block(match.blockID).container),
    true,
  );
}

function selectedTextAsQuery() {
  let selected = window.getSelection()?.toString().trim() ?? "";
  if (!selected || selected.length > 200 || selected.includes("\n"))
    return undefined;
  return selected;
}
