import { PubLeafletBlocksMath } from "lexicons/api";
import Katex from "katex";
import "katex/dist/katex.min.css";

export const StaticMathBlock = ({
  block,
}: {
  block: PubLeafletBlocksMath.Main;
}) => {
  const html = Katex.renderToString(block.tex, {
    displayMode: true,
    output: "html",
    throwOnError: false,
  });
  return (
    <div className="math-block my-2">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
