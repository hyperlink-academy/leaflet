"use client";
import { useEffect, useRef, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import useMeasure from "react-use-measure";

// The read-only "ALT" pill that expands to reveal alt text. Shared by the
// editor (ImageAltButton's reader mode) and published posts so both render alt
// text identically. Purely presentational — takes the alt string directly so it
// has no replicache dependency and is safe to render on public post pages.
export function ReadOnlyAltText(props: {
  alt: string;
  className?: string;
  onSeeMore?: () => void;
}) {
  let [showAlt, setShowAlt] = useState(false);
  let [altRef, { height: altHeight }] = useMeasure();
  let altStyle = useSpring({
    height: showAlt ? altHeight : 0,
    opacity: showAlt ? 1 : 0,
    config: { tension: 450, friction: 30, clamp: true },
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
          <AltTextBody alt={props.alt} onSeeMore={props.onSeeMore} />
        </div>
      </animated.div>
    </div>
  );
}

// The alt text itself, clamped on the image. Alt longer than the clamp gets a
// "See more" that hands off to the lightbox, which can give it the full height.
export function AltTextBody(props: { alt: string; onSeeMore?: () => void }) {
  let [overflows, setOverflows] = useState(false);
  let textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let el = textRef.current;
    if (!el) return;
    let measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    let observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [props.alt]);

  return (
    <div className="opaque-container leading-snug text-secondary border-none! text-sm px-1.5 p-1 shrink-0">
      <div className="relative">
        <div ref={textRef} className="line-clamp-4">
          {props.alt}
        </div>
        {overflows && props.onSeeMore && (
          // Sits on the clipped last line, over the text it truncates.
          <button
            className="absolute bottom-0 right-0 bg-bg-page pl-2 text-accent-contrast "
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              props.onSeeMore?.();
            }}
          >
            See more
          </button>
        )}
      </div>
    </div>
  );
}
