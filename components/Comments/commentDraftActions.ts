import { EditorView } from "prosemirror-view";
import { v7 } from "uuid";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { generateKeyBetween } from "fractional-indexing";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { schema } from "components/Blocks/TextBlock/schema";
import {
  commentDraftKey,
  getCommentDraftRange,
} from "components/Blocks/TextBlock/commentDraftPlugin";
import { useEditorStates } from "src/state/useEditorState";
import { scanIndex } from "src/replicache/utils";
import { useCommentDraftStore, useCommentSheetStore } from "./commentStores";

export function startCommentDraft(
  view: EditorView,
  blockID: string,
  pageID: string,
) {
  let { from, to } = view.state.selection;
  if (from === to) {
    // With a collapsed selection, anchor the comment to the word at the cursor
    let $from = view.state.doc.resolve(from);
    let parentStart = $from.start();
    let text = $from.parent.textBetween(
      0,
      $from.parent.content.size,
      undefined,
      "￼",
    );
    let offset = from - parentStart;
    let start = offset;
    let end = offset;
    while (start > 0 && /\S/.test(text[start - 1])) start--;
    while (end < text.length && /\S/.test(text[end])) end++;
    if (start === end) return;
    from = parentStart + start;
    to = parentStart + end;
  }

  let existing = useCommentDraftStore.getState().draft;
  if (existing && existing.blockID !== blockID)
    clearDraftDecoration(existing.blockID);

  view.dispatch(view.state.tr.setMeta(commentDraftKey, { from, to }));
  useCommentDraftStore.setState({ draft: { blockID, pageID } });
}

function clearDraftDecoration(blockID: string) {
  let editorState = useEditorStates.getState().editorStates[blockID];
  if (editorState?.view) {
    editorState.view.dispatch(
      editorState.view.state.tr.setMeta(commentDraftKey, null),
    );
  }
}

export function cancelCommentDraft() {
  let draft = useCommentDraftStore.getState().draft;
  if (!draft) return;
  clearDraftDecoration(draft.blockID);
  useCommentDraftStore.setState({ draft: null });
}

export async function submitCommentDraft({
  rep,
  permissionSet,
  authorDid,
  ydoc,
}: {
  rep: Replicache<ReplicacheMutators>;
  permissionSet: string;
  authorDid: string;
  ydoc: Y.Doc;
}) {
  let draft = useCommentDraftStore.getState().draft;
  if (!draft) return;
  let view = useEditorStates.getState().editorStates[draft.blockID]?.view;
  if (!view) return;
  let range = getCommentDraftRange(view.state);
  if (!range) return;

  let commentEntityID = v7();

  // Order the new comment among the block's existing comments by where its
  // anchor falls in the text, mirroring insertFootnote.
  let existingComments = await rep.query(async (tx) => {
    let scan = scanIndex(tx);
    return scan.eav(draft.blockID, "block/comment");
  });
  let positionByEntityID: Record<string, string> = {};
  for (let c of existingComments) {
    positionByEntityID[c.data.value] = c.data.position;
  }
  let anchorPosByEntityID: Record<string, number> = {};
  view.state.doc.descendants((node, pos) => {
    for (let mark of node.marks) {
      if (mark.type === schema.marks.comment) {
        let id = mark.attrs.commentID;
        if (anchorPosByEntityID[id] === undefined)
          anchorPosByEntityID[id] = pos;
      }
    }
  });
  let beforePosition: string | null = null;
  let afterPosition: string | null = null;
  for (let [entityID, anchorPos] of Object.entries(anchorPosByEntityID)) {
    let p = positionByEntityID[entityID];
    if (p === undefined) continue;
    if (anchorPos < range.from) {
      if (beforePosition === null || p > beforePosition) beforePosition = p;
    } else {
      if (afterPosition === null || p < afterPosition) afterPosition = p;
    }
  }
  let position = generateKeyBetween(beforePosition, afterPosition);

  await rep.mutate.createComment({
    commentEntityID,
    blockID: draft.blockID,
    permission_set: permissionSet,
    position,
    authorDid,
    createdAt: new Date().toISOString(),
    anchorStart: range.from,
    anchorEnd: range.to,
    content: base64.fromByteArray(Y.encodeStateAsUpdate(ydoc)),
  });

  let tr = view.state.tr
    .addMark(
      range.from,
      range.to,
      schema.marks.comment.create({ commentID: commentEntityID }),
    )
    .setMeta(commentDraftKey, null);
  view.dispatch(tr);

  useCommentDraftStore.setState({ draft: null });
  return commentEntityID;
}

export function deleteCommentFromBlock(
  commentEntityID: string,
  blockID: string,
  rep: Replicache<ReplicacheMutators> | null,
) {
  if (!rep) return;

  let editorState = useEditorStates.getState().editorStates[blockID];
  if (editorState?.view) {
    let view = editorState.view;
    let tr = view.state.tr;
    let markType = schema.marks.comment;
    view.state.doc.descendants((node, pos) => {
      let mark = node.marks.find(
        (m) => m.type === markType && m.attrs.commentID === commentEntityID,
      );
      if (mark) tr.removeMark(pos, pos + node.nodeSize, mark);
    });
    if (tr.steps.length > 0) view.dispatch(tr);
  }

  rep.mutate.deleteComment({ commentEntityID, blockID });
}
