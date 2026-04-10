import { MarkType, Node } from "prosemirror-model";

export function findMarkRange(
  doc: Node,
  markType: MarkType,
  from: number,
  to?: number,
) {
  let start = from;
  let end = to ?? from;
  let $start = doc.resolve(start);
  let $end = doc.resolve(end);
  while (
    $start.nodeBefore &&
    $start.nodeBefore.marks.some((m) => m.type === markType)
  ) {
    start -= $start.nodeBefore.nodeSize;
    $start = doc.resolve(start);
  }
  while (
    $end.nodeAfter &&
    $end.nodeAfter.marks.some((m) => m.type === markType)
  ) {
    end += $end.nodeAfter.nodeSize;
    $end = doc.resolve(end);
  }
  return { start, end };
}
