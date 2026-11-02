import type Katex from "katex";

export const renderMath = (katex: typeof Katex, tex: string) =>
  katex.renderToString(tex, {
    displayMode: true,
    output: "html",
    throwOnError: false,
  });
