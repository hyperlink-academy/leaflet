"use client";
import { useEffect, useState } from "react";
import { ToggleGroup } from "components/ToggleGroup";

type Page = "drafts" | "posts" | "analytics" | "settings";

const PAGES: { id: Page; label: string }[] = [
  { id: "drafts", label: "Drafts" },
  { id: "posts", label: "Posts" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

const AUTOPLAY_INTERVAL_MS = 5000;

export function InteractiveAppDemoMobile() {
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
    <div className="flex flex-col gap-3 w-full max-w-[320px] mx-auto">
      <ToggleGroup
        fullWidth
        className="bg-[#F1EDE5]! w-fill mx-auto"
        selectedOptionClassName="bg-[#686153]! text-white!"
        optionClassName="text-[#969696]! text-sm"
        value={page}
        onChange={handleClick}
        options={PAGES.map((p) => ({ value: p.id, label: p.label }))}
      />
      <div className="relative w-full aspect-[752/1334] rounded-lg shadow-md overflow-hidden">
        {PAGES.map((p) => (
          <img
            key={p.id}
            src={`/about/mobile-landing-${p.id}.webp`}
            alt={p.id === page ? `Leaflet ${p.label} page` : ""}
            aria-hidden={p.id !== page}
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: page === p.id ? 1 : 0,
              transition: animate ? "opacity 700ms ease-in-out" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
