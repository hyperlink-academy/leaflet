"use client";
import { useEffect, useRef } from "react";

const MAX_DESCRIPTION_LINES = 3;

function lineHeight(el: HTMLElement) {
  const computed = getComputedStyle(el);
  const value = parseFloat(computed.lineHeight);
  // `line-height: normal` doesn't resolve to a length; approximate it the way
  // browsers do.
  return Number.isFinite(value) ? value : parseFloat(computed.fontSize) * 1.2;
}

// A clamp only takes effect on a `-webkit-box`, which callers may or may not
// have set via a line-clamp class, so own the whole set here.
function clampTo(el: HTMLElement, lines: number | "unset") {
  el.style.display = "-webkit-box";
  el.style.setProperty("-webkit-box-orient", "vertical");
  el.style.overflow = "hidden";
  el.style.webkitLineClamp = String(lines);
}

/**
 * Fits a title (and an optional description below it) inside the height of the
 * box they're in, giving the title as many lines as it needs and the
 * description whatever's left. Both get a real `-webkit-line-clamp`, so what
 * doesn't fit ends in an ellipsis on a line boundary — which is why this
 * measures instead of leaving it to CSS overflow.
 *
 * The budget is however tall the box ends up: give it `overflow-hidden` and a
 * height the layout constrains (a `max-height` of its own, or `grow min-h-0`
 * inside a capped parent) and whatever siblings take — a publication header,
 * say — is already subtracted. The line-clamp classes rendered on the elements
 * are the pre-hydration fallback, until the first measurement lands.
 *
 * Put any gap between the two on the box's row-gap or the description's
 * margin-top; padding on the title would throw off its line count.
 */
export function useFitToHeight(...content: unknown[]) {
  const boxRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const fit = () => {
      const title = titleRef.current;
      const description = descriptionRef.current;

      // Drop any clamp from the last pass before measuring: with the full text
      // laid out, the box is either as tall as its content (everything fits)
      // or as tall as the layout allows (the budget). Reading a clamped box
      // would just measure the previous result and never grow back.
      if (title) clampTo(title, "unset");
      if (description) clampTo(description, "unset");
      const available = box.clientHeight;
      if (available <= 0) return;

      let titleHeight = 0;
      if (title) {
        const titleLine = lineHeight(title);
        const titleLines = Math.round(title.scrollHeight / titleLine);
        const fittedTitleLines = Math.max(
          1,
          Math.min(titleLines, Math.floor(available / titleLine)),
        );
        clampTo(title, fittedTitleLines);
        titleHeight = fittedTitleLines * titleLine;
      }

      if (!description) return;
      const descriptionLine = lineHeight(description);
      if (descriptionLine <= 0) return;
      // The gap between the two is either the box's own row-gap or a margin on
      // the description — and only costs anything if there's a title above.
      const gap = !title
        ? 0
        : (parseFloat(getComputedStyle(box).rowGap) || 0) +
          (parseFloat(getComputedStyle(description).marginTop) || 0);
      const fittedDescriptionLines = Math.min(
        MAX_DESCRIPTION_LINES,
        Math.max(0, Math.floor((available - titleHeight - gap) / descriptionLine)),
      );
      if (fittedDescriptionLines === 0) description.style.display = "none";
      else clampTo(description, fittedDescriptionLines);
    };

    fit();
    // Width changes reflow both, and a late-loading theme font changes the
    // metrics all of this is derived from. Only react to width: fitting
    // changes the box's own height, which would otherwise re-enter here.
    let lastWidth = box.clientWidth;
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === lastWidth) return;
      lastWidth = box.clientWidth;
      fit();
    });
    observer.observe(box);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, content);

  return { boxRef, titleRef, descriptionRef };
}
