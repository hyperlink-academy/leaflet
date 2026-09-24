import { PubLeafletBlocksDrawing } from "lexicons/api";
import { InkSvg } from "components/Blocks/DrawingBlock/InkSvg";

export const StaticDrawingBlock = ({
  block,
}: {
  block: PubLeafletBlocksDrawing.Main;
}) => {
  return (
    <div className="drawingBlock w-full">
      <InkSvg
        viewBox={block.viewBox}
        strokes={block.strokes.map((stroke, i) => ({ id: String(i), stroke }))}
      />
    </div>
  );
};
