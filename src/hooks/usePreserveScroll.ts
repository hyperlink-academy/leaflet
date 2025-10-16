import { useRef, useEffect } from "react";

let scrollPositions: { [key: string]: number } = {};
export function usePreserveScroll<T extends HTMLElement>(key: string | null) {
  let ref = useRef<T | null>(null);
  useEffect(() => {
    if (!ref.current || !key) return;

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
