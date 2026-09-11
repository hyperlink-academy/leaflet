import Katex from "katex";
import "katex/dist/katex.min.css";

// Loaded on demand: katex and its stylesheet (60 @font-face rules) are only
// needed by documents that actually contain a math block.
export const renderMath = (tex: string, errorColor?: string) =>
  Katex.renderToString(tex, {
    displayMode: true,
    throwOnError: false,
    errorColor,
  });
