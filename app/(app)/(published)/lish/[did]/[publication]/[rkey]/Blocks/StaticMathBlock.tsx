"use client";
import { PubLeafletBlocksMath } from "lexicons/api";
import { useMathHtml } from "components/Blocks/useMathHtml";
// Statically imported, unlike the katex renderer: the server prerenders this
// block's HTML, so this path never loads the renderer chunk that otherwise
// carries the stylesheet.
import "katex/dist/katex.min.css";

export const StaticMathBlock = ({
  block,
  prerenderedHtml,
}: {
  block: PubLeafletBlocksMath.Main;
  prerenderedHtml?: string;
}) => {
  let renderedHtml = useMathHtml(prerenderedHtml ? undefined : block.tex);
  let html = prerenderedHtml || renderedHtml;
  return (
    <div className="math-block my-2">
      {/* Blank, not the raw TeX: the source and the rendered formula are very
          differently sized, so showing the source first reflows the document
          below it when katex lands. */}
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="min-h-[2rem]" />
      )}
    </div>
  );
};
