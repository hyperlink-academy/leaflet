import { useRef, useEffect } from "react";

let scrollPositions: { [key: string]: number } = {};

// Drop a remembered offset, so the next render under `key` starts at the top
// instead of where the reader last left that page.
export function forgetScrollPosition(key: string) {
  delete scrollPositions[key];
}

export function usePreserveScroll<T extends HTMLElement>(key: string | null) {
  let ref = useRef<T | null>(null);
  let lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (!ref.current || !key) return;

    let keyChanged = lastKey.current !== null && lastKey.current !== key;
    lastKey.current = key;

    if (scrollPositions[key] !== undefined || keyChanged)
      window.requestAnimationFrame(() => {
        ref.current?.scrollTo({ top: scrollPositions[key] || 0 });
      });

    const listener = () => {
      if (!ref.current?.scrollTop) return;
      scrollPositions[key] = ref.current.scrollTop;
    };

    ref.current.addEventListener("scroll", listener);
    return () => ref.current?.removeEventListener("scroll", listener);
  }, [key, ref.current]);
  return { ref };
}
