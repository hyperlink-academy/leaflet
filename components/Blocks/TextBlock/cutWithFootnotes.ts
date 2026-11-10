import { EditorView } from "prosemirror-view";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { renderFootnoteDefHTML } from "src/utils/renderFootnoteDefHTML";
import { schema } from "./schema";

// Cutting a footnote ref deletes its entity, and ProseMirror's own clipboard
// HTML carries only the entity id, leaving paste nothing to restore. Write the
// clipboard ourselves so each ref carries its definition (data-footnote-def),
// from which paste mints a fresh footnote.
export function cutWithFootnotes(
  view: EditorView,
  event: ClipboardEvent,
  rep: Replicache<ReplicacheMutators> | null,
) {
  let { from, to } = view.state.selection;
  let hasFootnote = false;
  view.state.doc.nodesBetween(from, to, (n) => {
    if (n.type === schema.nodes.footnote) hasFootnote = true;
  });
  if (!rep || !view.editable || !hasFootnote) return false;
  event.preventDefault();

  let { dom, text } = view.serializeForClipboard(
    view.state.selection.content(),
  );
  let html = rep.query(async (tx) => {
    for (let ref of dom.querySelectorAll("span.footnote-ref")) {
      let [content] = await scanIndex(tx).eav(
        ref.getAttribute("data-footnote-id") || "",
        "block/text",
      );
      if (content)
        ref.setAttribute(
          "data-footnote-def",
          renderFootnoteDefHTML(content.data.value),
        );
    }
    return new Blob([dom.innerHTML], { type: "text/html" });
  });
  // Called inside the cut gesture with a pending blob: Safari rejects a
  // clipboard write that starts after an await.
  navigator.clipboard.write([
    new ClipboardItem({
      "text/html": html,
      "text/plain": new Blob([text], { type: "text/plain" }),
    }),
  ]);
  // The delete waits for the read so it can't race the footnote's deletion.
  html.then(() => {
    if (view.isDestroyed) return;
    view.dispatch(
      view.state.tr
        .deleteSelection()
        .scrollIntoView()
        .setMeta("uiEvent", "cut"),
    );
  });
  return true;
}
