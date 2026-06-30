"use client";
import { useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import useMeasure from "react-use-measure";

// The read-only "ALT" pill that expands to reveal alt text. Shared by the
// editor (ImageAltButton's reader mode) and published posts so both render alt
// text identically. Purely presentational — takes the alt string directly so it
// has no replicache dependency and is safe to render on public post pages.
export function ReadOnlyAltText(props: { alt: string; className?: string }) {
  let [showAlt, setShowAlt] = useState(false);
  let [altRef, { height: altHeight }] = useMeasure();
  let altStyle = useSpring({
    height: showAlt ? altHeight : 0,
    opacity: showAlt ? 1 : 0,
    config: { tension: 450, friction: 30 },
  });

  if (!props.alt) return null;

  return (
    <div
      onBlur={(e) => {
        let group = e.currentTarget;
        requestAnimationFrame(() => {
          if (!group.contains(document.activeElement)) setShowAlt(false);
        });
      }}
      className={`absolute bottom-1.5 right-1.5 left-1.5 flex flex-col h-fit ${props.className || ""}`}
    >
      <div className="flex gap-1 items-center justify-end">
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            setShowAlt((s) => !s);
          }}
        >
          <div className="text-xs font-bold px-1 leading-tight opaque-container border-2! border-secondary! text-secondary rounded-md! h-5">
            ALT
          </div>
        </button>
      </div>
      <animated.div style={{ ...altStyle, overflow: "hidden" }}>
        <div className="pt-1" ref={altRef}>
          <div className="opaque-container leading-snug text-secondary border-none! line-clamp-4 text-sm px-1.5 p-1 shrink-0">
            {props.alt}
          </div>
        </div>
      </animated.div>
    </div>
  );
}
