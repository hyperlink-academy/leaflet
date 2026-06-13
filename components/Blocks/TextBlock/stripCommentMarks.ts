import { Fragment, Node, Slice } from "prosemirror-model";

// Comment marks anchor a thread to a range in one specific block, so they
// must never travel through the clipboard: a copied anchor would attach the
// original thread to unrelated text, and deleting either copy would delete
// the thread (see the comment-diffing in mountProsemirror). Passed as the
// editor's transformCopied/transformPasted props; paste paths that parse
// clipboard HTML themselves strip the span.comment-anchor markup instead.
export function stripCommentMarks(slice: Slice): Slice {
  return new Slice(
    stripFragment(slice.content),
    slice.openStart,
    slice.openEnd,
  );
}

function stripFragment(fragment: Fragment): Fragment {
  let children: Node[] = [];
  fragment.forEach((node) => {
    let stripped = node.mark(
      node.marks.filter((m) => m.type.name !== "comment"),
    );
    if (stripped.content.childCount)
      stripped = stripped.copy(stripFragment(stripped.content));
    children.push(stripped);
  });
  return Fragment.fromArray(children);
}
