"use client";

import { useCallback } from "react";
import * as Y from "yjs";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useIdentityData } from "components/IdentityProvider";
import { useFootnoteContext } from "components/Footnotes/FootnoteContext";
import { FootnoteEditor } from "components/Footnotes/FootnoteEditor";
import { deleteFootnoteFromBlock } from "components/Footnotes/deleteFootnoteFromBlock";
import { FootnoteSideColumnLayout } from "components/Footnotes/FootnoteSideColumnLayout";
import { useCommentContext } from "./CommentContext";
import { useCommentDraftStore, useCommentSheetStore } from "./commentStores";
import { cancelCommentDraft, submitCommentDraft } from "./commentDraftActions";
import { CommentComposer } from "./CommentComposer";
import { CommentLoginPrompt } from "./CommentLoginPrompt";
import { CommentThread } from "./CommentThread";

type SideAnnotation =
  | {
      kind: "footnote";
      id: string;
      index: number;
      footnoteEntityID: string;
      blockID: string;
    }
  | { kind: "comment"; id: string; commentEntityID: string; blockID: string }
  | { kind: "draft"; id: string; blockID: string };

// Footnotes and comments share one side column; comments render wider, in a
// box matching the page background.
export function AnnotationSideColumn(props: {
  pageEntityID: string;
  visible: boolean;
  fullPageScroll?: boolean;
}) {
  let { footnotes } = useFootnoteContext();
  let { comments } = useCommentContext();
  let draft = useCommentDraftStore((s) => s.draft);
  let { permissions } = useEntitySetContext();
  let rep = useReplicache();

  let items: SideAnnotation[] = [
    ...footnotes.map(
      (fn) =>
        ({
          kind: "footnote",
          id: fn.footnoteEntityID,
          index: fn.index,
          footnoteEntityID: fn.footnoteEntityID,
          blockID: fn.blockID,
        }) as const,
    ),
    ...comments.map(
      (c) =>
        ({
          kind: "comment",
          id: c.commentEntityID,
          commentEntityID: c.commentEntityID,
          blockID: c.blockID,
        }) as const,
    ),
  ];
  if (draft && draft.pageID === props.pageEntityID) {
    items.push({ kind: "draft", id: "comment-draft", blockID: draft.blockID });
  }

  let getAnchorSelector = useCallback((item: SideAnnotation) => {
    if (item.kind === "footnote")
      return `.footnote-ref[data-footnote-id="${item.id}"]`;
    if (item.kind === "draft") return `.comment-draft-anchor`;
    // ~= matches within the space-separated ID list overlapping comments share
    return `.comment-anchor[data-comment-id~="${item.id}"]`;
  }, []);

  let getItemClassName = useCallback((item: SideAnnotation) => {
    if (item.kind === "footnote") return "w-[250px] footnote-side-item";
    if (item.kind === "draft")
      return "w-[320px] comment-side-item comment-side-focused";
    return "w-[320px] comment-side-item";
  }, []);

  let getItemFocusKind = useCallback(
    (item: SideAnnotation) =>
      item.kind === "footnote" ? ("footnote" as const) : ("comment" as const),
    [],
  );

  let renderItem = useCallback(
    (item: SideAnnotation & { top: number }) => {
      if (item.kind === "footnote")
        return (
          <FootnoteEditor
            footnoteEntityID={item.footnoteEntityID}
            index={item.index}
            editable={permissions.write}
            onDelete={
              permissions.write
                ? () =>
                    deleteFootnoteFromBlock(
                      item.footnoteEntityID,
                      item.blockID,
                      rep.rep,
                    )
                : undefined
            }
          />
        );
      if (item.kind === "draft") return <CommentDraftComposer />;
      return (
        <CommentThread
          commentEntityID={item.commentEntityID}
          blockID={item.blockID}
          pageID={props.pageEntityID}
        />
      );
    },
    [permissions.write, rep.rep, props.pageEntityID],
  );

  return (
    <FootnoteSideColumnLayout
      items={items}
      visible={props.visible}
      fullPageScroll={props.fullPageScroll}
      getAnchorSelector={getAnchorSelector}
      getItemClassName={getItemClassName}
      getItemFocusKind={getItemFocusKind}
      columnClassName="w-[320px]"
      renderItem={renderItem}
    />
  );
}

export function CommentDraftComposer(props: { autoFocus?: boolean }) {
  let rep = useReplicache();
  let entity_set = useEntitySetContext();
  let { identity } = useIdentityData();

  if (!identity?.atp_did)
    return <CommentLoginPrompt onCancel={cancelCommentDraft} />;
  let atp_did = identity.atp_did;

  return (
    <CommentComposer
      autoFocus={props.autoFocus ?? true}
      placeholder="Add a comment..."
      submitLabel="Submit"
      onSubmit={async (ydoc: Y.Doc) => {
        if (!rep.rep) return;
        let commentEntityID = await submitCommentDraft({
          rep: rep.rep,
          permissionSet: entity_set.set,
          authorDid: atp_did,
          ydoc,
        });
        // If drafting in the mobile sheet, show the posted thread there
        let sheet = useCommentSheetStore.getState();
        if (commentEntityID && sheet.pageID) {
          sheet.openSheet(sheet.pageID, commentEntityID);
        }
      }}
      onCancel={cancelCommentDraft}
    />
  );
}
