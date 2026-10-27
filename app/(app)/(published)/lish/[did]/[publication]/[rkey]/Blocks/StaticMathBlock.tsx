import { useEffect, useState } from "react";
import { PubLeafletBlocksMath } from "lexicons/api";
import { renderMath } from "./renderMath";
import "katex/dist/katex.min.css";

// Posts arrive with their math rendered server-side; katex only loads for
// surfaces that render a post without its block resources (theme preview).
export const StaticMathBlock = ({
  block,
  html,
}: {
  block: PubLeafletBlocksMath.Main;
  html?: string;
}) => {
  const [rendered, setRendered] = useState<string>();
  useEffect(() => {
    if (html) return;
    import("katex").then((k) => setRendered(renderMath(k.default, block.tex)));
  }, [html, block.tex]);
  return (
    <div className="math-block my-2">
      <div dangerouslySetInnerHTML={{ __html: html ?? rendered ?? "" }} />
    </div>
  );
};
