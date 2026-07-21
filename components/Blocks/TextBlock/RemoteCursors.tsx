"use client";
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { relativePositionToAbsolutePosition, ySyncPluginKey } from "y-prosemirror";
import { useEditorStates } from "src/state/useEditorState";
import { cursorRelevanceFilter } from "./remoteCursorPlugin";
import {
  CONTRACT_MS,
  cursorColors,
  ensureGooFilter,
  getSpringVars,
} from "./collabCursor";

// Renders remote collaborators' carets for one editor in an absolutely
// positioned layer OUTSIDE the contenteditable, positioned via
// view.coordsAtPos — the architecture Lexical and slate-yjs use for remote
// cursors. Nothing is injected into the editable DOM (remote selections are
// inline decorations, which only style existing text), so the native
// selection sweep never encounters a widget island and mobile
// caret/selection-handle drags can't be interrupted by remote cursors.
//
// The layer is a 0×0 positioned anchor; carets are placed at
// (caret viewport rect − anchor viewport rect), which stays valid while
// scrolling since both move together. Positions are recomputed (rAF
// coalesced, after the editor DOM has updated) on awareness changes, editor
// state changes, and resizes.

type RemoteCursorData = {
  clientId: number;
  name: string;
  hue: number;
  left: number;
  top: number;
  height: number;
  // caret's distance to the block's overflow-clip edges (Infinity when the
  // editor has no .yjs-cursor-clip ancestor, e.g. footnotes) — used to grow
  // the name pill away from an edge it would be clipped by
  spaceLeft: number;
  spaceRight: number;
};

const cursorsEqual = (a: RemoteCursorData[], b: RemoteCursorData[]) =>
  a.length === b.length &&
  a.every((c, i) => {
    const d = b[i];
    return (
      c.clientId === d.clientId &&
      c.name === d.name &&
      c.hue === d.hue &&
      c.left === d.left &&
      c.top === d.top &&
      c.height === d.height &&
      c.spaceLeft === d.spaceLeft &&
      c.spaceRight === d.spaceRight
    );
  });

export function RemoteCursors(props: { entityID: string; awareness: Awareness }) {
  let anchorRef = useRef<HTMLDivElement | null>(null);
  let [cursors, setCursors] = useState<RemoteCursorData[]>([]);

  useEffect(() => {
    ensureGooFilter();
    let raf: number | null = null;
    let observedDom: Element | null = null;
    let resizeObserver = new ResizeObserver(() => schedule());
    const recompute = () => {
      raf = null;
      const anchor = anchorRef.current;
      const view = useEditorStates.getState().editorStates[props.entityID]?.view;
      const next: RemoteCursorData[] = [];
      if (anchor && view && (view as any).docView) {
        if (view.dom !== observedDom) {
          if (observedDom) resizeObserver.unobserve(observedDom);
          observedDom = view.dom;
          resizeObserver.observe(view.dom);
        }
        const ystate = ySyncPluginKey.getState(view.state);
        if (
          ystate?.binding &&
          ystate.snapshot == null &&
          ystate.prevSnapshot == null
        ) {
          const anchorRect = anchor.getBoundingClientRect();
          const clipRect = anchor
            .closest(".yjs-cursor-clip")
            ?.getBoundingClientRect();
          props.awareness.getStates().forEach((aw, clientId) => {
            if (clientId === props.awareness.clientID || aw.cursor == null)
              return;
            // The awareness is shared page-wide; only draw carets pointing
            // into this block's entity.
            if (aw.cursor.entityID !== props.entityID) return;
            let head = relativePositionToAbsolutePosition(
              ystate.doc,
              ystate.type,
              Y.createRelativePositionFromJSON(aw.cursor.head),
              ystate.binding.mapping,
            );
            if (head === null) return;
            head = Math.min(
              head,
              Math.max(view.state.doc.content.size - 1, 0),
            );
            let coords;
            try {
              coords = view.coordsAtPos(head);
            } catch {
              return;
            }
            next.push({
              clientId,
              name: aw.user?.name || "Anonymous",
              hue: aw.user?.hue ?? 0,
              left: coords.left - anchorRect.left,
              top: coords.top - anchorRect.top,
              height: coords.bottom - coords.top,
              spaceLeft: clipRect ? coords.left - clipRect.left : Infinity,
              spaceRight: clipRect ? clipRect.right - coords.left : Infinity,
            });
          });
        }
      }
      setCursors((prev) => (cursorsEqual(prev, next) ? prev : next));
    };
    const schedule = () => {
      if (raf === null) raf = window.requestAnimationFrame(recompute);
    };
    // Shared awareness: skip changes whose cursors neither are nor were in
    // this entity, so a caret move in one block doesn't recompute every
    // overlay on the page.
    const relevance = cursorRelevanceFilter(props.awareness, props.entityID);
    const onAwarenessChange = (changes: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      if (relevance(changes)) schedule();
    };
    props.awareness.on("change", onAwarenessChange);
    // Only recompute when *this* block's editor changes. setEditorState
    // replaces just the edited entity's entry, so a keystroke in another
    // block leaves our entry referentially equal and is skipped — otherwise
    // every overlay on the page would recompute on every keystroke anywhere.
    // (A neighbouring block reflowing moves the caret and its anchor together,
    // so the stored anchor-relative offset stays valid without a recompute.)
    const unsubscribe = useEditorStates.subscribe((state, prev) => {
      if (
        state.editorStates[props.entityID] !== prev.editorStates[props.entityID]
      )
        schedule();
    });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      props.awareness.off("change", onAwarenessChange);
      unsubscribe();
      window.removeEventListener("resize", schedule);
      resizeObserver.disconnect();
      if (raf !== null) window.cancelAnimationFrame(raf);
    };
  }, [props.entityID, props.awareness]);

  if (cursors.length === 0)
    return <div className="yjs-cursor-layer" ref={anchorRef} aria-hidden />;
  return (
    <div className="yjs-cursor-layer" ref={anchorRef} aria-hidden>
      {cursors.map((c) => (
        <RemoteCursor key={c.clientId} cursor={c} />
      ))}
    </div>
  );
}

// keep in sync with the `.yjs-cursor-open .yjs-cursor-pill` max-width in
// globals.css
const PILL_MAX_WIDTH = 240;

function RemoteCursor({ cursor }: { cursor: RemoteCursorData }) {
  let [phase, setPhase] = useState<"rest" | "contract" | "open">("rest");
  let [expand, setExpand] = useState<"" | "left" | "right">("");
  let timer = useRef<number | null>(null);
  let labelTextRef = useRef<HTMLSpanElement | null>(null);
  let spring = getSpringVars();
  let colors = cursorColors(cursor.hue);

  // hover or focus in → brief contraction, then spring open; out → ease
  // back. On touch devices a tap drives these through the browser's native
  // tap → hover/focus emulation — safe now that the cursor lives outside
  // the editable. States are classes driving transitions (never keyframes),
  // so interrupting mid-animation stays smooth.
  const beginReveal = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    // Pick the pill's growth direction while it's still a dot (switching the
    // anchor class is invisible at dot size): if a centered pill would cross
    // a clip edge, grow it toward the other side instead.
    const pillWidth = Math.min(
      labelTextRef.current?.offsetWidth ?? 0,
      PILL_MAX_WIDTH,
    );
    setExpand(
      cursor.spaceLeft < pillWidth / 2
        ? "right"
        : cursor.spaceRight < pillWidth / 2
          ? "left"
          : "",
    );
    setPhase("contract");
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setPhase("open");
    }, CONTRACT_MS);
  };
  const endReveal = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPhase("rest");
  };
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div
      className={`ProseMirror-yjs-cursor ${
        phase === "contract" ? "yjs-cursor-contract" : ""
      } ${phase === "open" ? "yjs-cursor-open" : ""} ${
        expand ? `yjs-cursor-expand-${expand}` : ""
      }`}
      style={
        {
          left: cursor.left,
          top: cursor.top,
          height: cursor.height,
          "--cursor-color": colors.color,
          "--cursor-text-color": colors.text,
          "--cursor-contract-shift": `${Math.round(cursor.height * 0.22 * 100) / 100}px`,
          "--yjs-spring-ease": spring.easing,
          "--yjs-spring-dur": `${spring.duration}ms`,
        } as React.CSSProperties
      }
      onMouseEnter={beginReveal}
      onMouseLeave={endReveal}
      onFocus={beginReveal}
      onBlur={endReveal}
    >
      <div className="yjs-cursor-goo">
        <div className="yjs-cursor-stub" />
        <div className="yjs-cursor-pill">
          <span className="yjs-cursor-text yjs-cursor-sizer">{cursor.name}</span>
        </div>
      </div>
      <div className="yjs-cursor-line" />
      <div className="yjs-cursor-overlay">
        <div
          className="yjs-cursor-hit"
          tabIndex={0}
          role="button"
          aria-label={cursor.name}
        />
        <div className="yjs-cursor-pill yjs-cursor-label">
          <span ref={labelTextRef} className="yjs-cursor-text">
            {cursor.name}
          </span>
        </div>
      </div>
    </div>
  );
}
