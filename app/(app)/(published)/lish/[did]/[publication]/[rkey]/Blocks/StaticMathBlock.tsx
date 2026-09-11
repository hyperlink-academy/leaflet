"use client";
import { PubLeafletBlocksMath } from "lexicons/api";
import { useMathHtml } from "components/Blocks/useMathHtml";

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
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="whitespace-pre-wrap">{block.tex}</div>
      )}
    </div>
  );
};
