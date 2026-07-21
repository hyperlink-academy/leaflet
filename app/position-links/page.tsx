"use client";
import { useEffect, useRef, useState } from "react";

type Page = "drafts" | "posts" | "analytics" | "settings";

type Box = {
  id: Page;
  top: number;
  left: number;
  width: number;
  height: number;
};

const INITIAL: Box[] = [
  { id: "drafts", top: 15.12, left: 2.51, width: 16.13, height: 2.2 },
  { id: "posts", top: 18.39, left: 2.51, width: 16.13, height: 2.2 },
  { id: "analytics", top: 24.49, left: 2.51, width: 16.13, height: 2.2 },
  { id: "settings", top: 27.54, left: 2.51, width: 16.13, height: 2.2 },
];

const PAGES: Page[] = ["drafts", "posts", "analytics", "settings"];

export default function PositionLinks() {
  let [image, setImage] = useState<Page>("drafts");
  let [boxes, setBoxes] = useState<Box[]>(INITIAL);
  let [syncX, setSyncX] = useState(true);
  let [cropPct, setCropPct] = useState(0);
  let containerRef = useRef<HTMLDivElement>(null);
  let dragState = useRef<{
    id: Page;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startBox: Box;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragState.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - dragState.current.startX) / rect.width) * 100;
      const dyPct =
        ((e.clientY - dragState.current.startY) / rect.height) * 100;
      const start = dragState.current.startBox;
      const id = dragState.current.id;
      const mode = dragState.current.mode;
      setBoxes((bs) =>
        bs.map((b) => {
          if (mode === "move") {
            if (b.id === id) {
              return { ...b, left: start.left + dxPct, top: start.top + dyPct };
            }
            if (syncX) {
              return { ...b, left: start.left + dxPct };
            }
            return b;
          } else {
            if (b.id === id) {
              return {
                ...b,
                width: Math.max(0.5, start.width + dxPct),
                height: Math.max(0.5, start.height + dyPct),
              };
            }
            if (syncX) {
              return { ...b, width: Math.max(0.5, start.width + dxPct) };
            }
            return b;
          }
        }),
      );
    };
    const onUp = () => {
      dragState.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [syncX]);

  const startDrag = (
    e: React.PointerEvent,
    id: Page,
    mode: "move" | "resize",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const box = boxes.find((b) => b.id === id);
    if (!box) return;
    dragState.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startBox: box,
    };
  };

  const code = boxes
    .map(
      (b) =>
        `  { id: "${b.id}", label: "${b.id[0].toUpperCase() + b.id.slice(1)}", topPct: ${b.top.toFixed(2)}, leftPct: ${b.left.toFixed(2)}, widthPct: ${b.width.toFixed(2)}, heightPct: ${b.height.toFixed(2)} },`,
    )
    .join("\n");

  return (
    <div className="p-4 flex flex-col gap-4 bg-white text-black min-h-screen">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Image:</span>
        {PAGES.map((p) => (
          <button
            key={p}
            onClick={() => setImage(p)}
            className={`px-3 py-1 rounded border text-sm ${image === p ? "bg-black text-white" : ""}`}
          >
            {p}
          </button>
        ))}
        <label className="flex items-center gap-1 text-sm ml-4">
          <input
            type="checkbox"
            checked={syncX}
            onChange={(e) => setSyncX(e.target.checked)}
          />
          Sync horizontal (left/width across all boxes)
        </label>
        <label className="flex items-center gap-1 text-sm ml-4">
          Width
          <input
            type="number"
            step="0.1"
            value={boxes[0]?.width.toFixed(2) ?? ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (isNaN(v)) return;
              setBoxes((bs) => bs.map((b) => ({ ...b, width: v })));
            }}
            className="w-20 px-2 py-1 border rounded text-sm"
          />
        </label>
        <label className="flex items-center gap-1 text-sm">
          Height
          <input
            type="number"
            step="0.1"
            value={boxes[0]?.height.toFixed(2) ?? ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (isNaN(v)) return;
              setBoxes((bs) => bs.map((b) => ({ ...b, height: v })));
            }}
            className="w-20 px-2 py-1 border rounded text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm ml-4">
          Crop each side
          <input
            type="range"
            min="0"
            max="40"
            step="0.1"
            value={cropPct}
            onChange={(e) => setCropPct(parseFloat(e.target.value))}
          />
          <span className="font-mono w-16">{cropPct.toFixed(2)}%</span>
        </label>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="ml-auto px-3 py-1 rounded border bg-green-600 text-white text-sm"
        >
          Copy positions
        </button>
        <button
          onClick={() => setBoxes(INITIAL)}
          className="px-3 py-1 rounded border text-sm"
        >
          Reset
        </button>
      </div>
      {(() => {
        const visibleFrac = 1 - (2 * cropPct) / 100;
        const innerWidthPct = 100 / visibleFrac;
        const innerLeftPct = -cropPct / visibleFrac;
        return (
          <div
            className="w-full max-w-[1200px] mx-auto overflow-hidden relative"
            style={{ aspectRatio: `${2249 * visibleFrac} / 1798` }}
          >
            <div
              ref={containerRef}
              className="absolute top-0 aspect-[2249/1798] select-none"
              style={{
                width: `${innerWidthPct}%`,
                left: `${innerLeftPct}%`,
              }}
            >
              <img
                src={`/about/landing-${image}.webp`}
                alt=""
                className="absolute inset-0 w-full h-full"
                draggable={false}
              />
              {boxes.map((b) => (
                <div
                  key={b.id}
                  onPointerDown={(e) => startDrag(e, b.id, "move")}
                  className="absolute outline-2 outline-red-500 bg-red-500/20 cursor-move"
                  style={{
                    top: `${b.top}%`,
                    left: `${b.left}%`,
                    width: `${b.width}%`,
                    height: `${b.height}%`,
                  }}
                >
                  <span className="absolute -top-5 left-0 text-[10px] bg-red-500 text-white px-1 rounded whitespace-nowrap">
                    {b.id}
                  </span>
                  <div
                    onPointerDown={(e) => startDrag(e, b.id, "resize")}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-red-500 cursor-se-resize"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      <pre className="bg-gray-100 p-3 rounded text-xs whitespace-pre overflow-x-auto">
        {code}
      </pre>
    </div>
  );
}
