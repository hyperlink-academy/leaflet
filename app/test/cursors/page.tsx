"use client";

// Manual test harness for the collaborative remote cursors. Renders the real
// <RemoteCursor> (the same component used in the editor) so what you see here
// matches production. Visit /test/cursors.
//
// Two things to check:
//   1. Visuals — the rest dot, the name pill when open, and the goo melt where
//      the caret line flows into the base of the pill. Toggle "force open" to
//      pin every cursor open (no hover needed; handy on touch).
//   2. Overflow — a cursor sitting at the right edge of a full-width box must
//      NOT make the page scroll sideways (the iOS Safari bug). The banner shows
//      whether the document is currently horizontally scrollable, and the
//      "clip overflow" toggle mirrors the fix (overflow-x-clip on the editor
//      wrapper) so you can A/B it.

import { useEffect, useState } from "react";
import {
  RemoteCursor,
  RemoteCursorData,
} from "components/Blocks/TextBlock/RemoteCursors";
import { ensureGooFilter } from "components/Blocks/TextBlock/collabCursor";

const NAMES = [
  "Jo",
  "Brendan",
  "Celine",
  "A really quite long display name that overflows",
];

const LINE_HEIGHT = 26;
const CARET_HEIGHT = 22;

function useHorizontalOverflow() {
  let [overflow, setOverflow] = useState(0);
  useEffect(() => {
    const measure = () => {
      let el = document.documentElement;
      setOverflow(el.scrollWidth - el.clientWidth);
    };
    measure();
    let id = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return overflow;
}

export default function CursorTestPage() {
  let [forceOpen, setForceOpen] = useState(false);
  let [clip, setClip] = useState(true);
  let overflow = useHorizontalOverflow();

  useEffect(() => {
    ensureGooFilter();
  }, []);

  // A spread of cursors down the left/middle of the gallery box, one per line,
  // cycling hues and names so colours and pill widths are all visible at once.
  let gallery: RemoteCursorData[] = NAMES.map((name, i) => ({
    clientId: i + 1,
    name,
    hue: i * 90,
    left: 12 + i * 40,
    top: 16 + i * LINE_HEIGHT,
    height: CARET_HEIGHT,
  }));

  return (
    <div className="min-h-full p-4 sm:p-8 flex flex-col gap-6 text-primary">
      <div
        className={`sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 border-b bg-bg-page flex flex-wrap items-center gap-x-5 gap-y-2 text-sm`}
      >
        <span className="font-bold">Cursor test</span>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={forceOpen}
            onChange={(e) => setForceOpen(e.target.checked)}
          />
          force open
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={clip}
            onChange={(e) => setClip(e.target.checked)}
          />
          clip overflow (the fix)
        </label>
        <span
          className={`ml-auto px-2 py-0.5 rounded-md font-medium ${
            overflow > 0
              ? "bg-[#ee6352] text-white"
              : "bg-[#6eeb83] text-black"
          }`}
        >
          {overflow > 0
            ? `page scrolls sideways: +${overflow}px`
            : "no horizontal overflow"}
        </span>
      </div>

      <Section
        title="Gallery"
        subtitle="hover a cursor (or tap on touch) to open it — or use “force open”. Check the dot, the name pill, and the goo melt at the pill’s base."
      >
        <Editor clip={clip} style={{ height: NAMES.length * LINE_HEIGHT + 48 }}>
          {gallery.map((c) => (
            <RemoteCursor key={c.clientId} cursor={c} forceOpen={forceOpen} />
          ))}
        </Editor>
      </Section>

      <Section
        title="Right-edge overflow"
        subtitle="a cursor pinned hard against the right edge of a full-width box. With “clip overflow” OFF, opening it (or even at rest near the very edge) should make the banner above go red on iOS Safari; with it ON the page must never scroll sideways."
      >
        <Editor clip={clip} style={{ height: 2 * LINE_HEIGHT + 48 }} edgeRef>
          {(width) => (
            <>
              <RemoteCursor
                cursor={{
                  clientId: 101,
                  name: "Edge",
                  hue: 200,
                  left: Math.max(width - 3, 0),
                  top: 16,
                  height: CARET_HEIGHT,
                }}
                forceOpen={forceOpen}
              />
              <RemoteCursor
                cursor={{
                  clientId: 102,
                  name: "Near edge",
                  hue: 40,
                  left: Math.max(width - 40, 0),
                  top: 16 + LINE_HEIGHT,
                  height: CARET_HEIGHT,
                }}
                forceOpen={forceOpen}
              />
            </>
          )}
        </Editor>
      </Section>
    </div>
  );
}

function Section(props: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="font-bold">{props.title}</h2>
        <p className="text-tertiary text-sm max-w-prose">{props.subtitle}</p>
      </div>
      {props.children}
    </div>
  );
}

// Mimics the editor block wrapper: full width, position:relative (the cursor
// layer's containing block), and the overflow-x-clip from the real fix. The
// `.yjs-cursor-layer` anchor sits at the top-left so cursor left/top are simple
// offsets into the box.
function Editor(props: {
  clip: boolean;
  style?: React.CSSProperties;
  edgeRef?: boolean;
  children: React.ReactNode | ((width: number) => React.ReactNode);
}) {
  let [width, setWidth] = useState(0);
  let setRef = (el: HTMLDivElement | null) => {
    if (el) setWidth(el.clientWidth);
  };
  useEffect(() => {
    if (!props.edgeRef) return;
    const onResize = () => {
      let el = document.getElementById("edge-editor");
      if (el) setWidth(el.clientWidth);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [props.edgeRef]);

  return (
    <div
      id={props.edgeRef ? "edge-editor" : undefined}
      ref={props.edgeRef ? setRef : undefined}
      className={`w-full relative border border-border-light rounded-lg bg-bg-page ${
        props.clip ? "overflow-x-clip" : ""
      }`}
      style={props.style}
    >
      <div className="yjs-cursor-layer" aria-hidden>
        {typeof props.children === "function"
          ? props.children(width)
          : props.children}
      </div>
    </div>
  );
}
