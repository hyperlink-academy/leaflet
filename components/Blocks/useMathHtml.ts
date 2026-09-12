"use client";
import { useEffect, useState } from "react";

// Null until katex has loaded and rendered. Callers should render nothing
// (not the raw TeX) while null: the source and the rendered formula are very
// differently sized, so showing the source first reflows the document below
// it when katex lands.
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
