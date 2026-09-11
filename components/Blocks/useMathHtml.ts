"use client";
import { useEffect, useState } from "react";

// Null until katex has loaded and rendered; callers show the raw TeX meanwhile.
export function useMathHtml(tex: string | undefined, errorColor?: string) {
  let [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    if (!tex) return setHtml(null);
    let stale = false;
    import("./renderMath").then(({ renderMath }) => {
      if (!stale) setHtml(renderMath(tex, errorColor));
    });
    return () => {
      stale = true;
    };
  }, [tex, errorColor]);
  return html;
}
