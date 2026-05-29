"use client";
import { useEffect, useState } from "react";

type Page = "drafts" | "posts" | "analytics" | "settings";

type Hit = {
  id: Page;
  label: string;
  topPct: number;
  leftPct: number;
};

const HIT_WIDTH_PCT = 16.33;
const HIT_HEIGHT_PCT = 2.8;
const AUTOPLAY_INTERVAL_MS = 5000;

const PAGES: Hit[] = [
  { id: "drafts", label: "Drafts", topPct: 14.83, leftPct: 2.28 },
  { id: "posts", label: "Posts", topPct: 18.0, leftPct: 2.28 },
  { id: "analytics", label: "Analytics", topPct: 23.95, leftPct: 2.28 },
  { id: "settings", label: "Settings", topPct: 27.15, leftPct: 2.28 },
];

export function InteractiveAppDemo() {
  let [page, setPage] = useState<Page>("drafts");
  let [autoplay, setAutoplay] = useState(true);
  let [animate, setAnimate] = useState(true);

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(() => {
      setAnimate(true);
      setPage((p) => {
        const idx = PAGES.findIndex((x) => x.id === p);
        return PAGES[(idx + 1) % PAGES.length].id;
      });
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoplay]);

  const handleClick = (id: Page) => {
    setAnimate(false);
    setAutoplay(false);
    setPage(id);
  };

  return (
    <div className="relative w-full max-w-[900px] mx-auto aspect-[2249/1798] rounded-lg shadow-md overflow-hidden">
      {PAGES.map((p) => (
        <img
          key={p.id}
          src={`/about/landing-${p.id}.webp`}
          alt={p.id === page ? `Leaflet ${p.label} page` : ""}
          aria-hidden={p.id !== page}
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: page === p.id ? 1 : 0,
            transition: animate ? "opacity 700ms ease-in-out" : "none",
          }}
        />
      ))}
      {PAGES.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-label={`Show ${p.label}`}
          aria-current={page === p.id ? "page" : undefined}
          onClick={() => handleClick(p.id)}
          className="absolute cursor-pointer rounded-sm"
          style={{
            top: `${p.topPct}%`,
            left: `${p.leftPct}%`,
            width: `${HIT_WIDTH_PCT}%`,
            height: `${HIT_HEIGHT_PCT}%`,
          }}
        />
      ))}
    </div>
  );
}
