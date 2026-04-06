import { schema } from "components/Blocks/TextBlock/schema";
import { TextSelection } from "prosemirror-state";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useEffect, useState } from "react";
import { Separator } from "components/Layout";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { findMarkRange } from "src/utils/prosemirror/findMarkRange";
import { ensureProtocol } from "src/utils/ensureProtocol";
import { Input } from "components/Input";
import { useReplicache } from "src/replicache";
import { CheckTiny } from "components/Icons/CheckTiny";
import { LinkSmall } from "components/Icons/LinkSmall";

export function LinkButton(props: { setToolbarState: (s: "link") => void }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  let isLink;
  if (focusedEditor) {
    let { to, from, $cursor } = focusedEditor.editor.selection as TextSelection;
    if ($cursor) isLink = !!schema.marks.link.isInSet($cursor.marks());
    if (to !== from)
      isLink = !!rangeHasMark(
        focusedEditor.editor,
        schema.marks.link,
        from,
        to,
      );
  }

  return (
    <ToolbarButton
      active={isLink}
      onClick={(e) => {
        e.preventDefault();
        props.setToolbarState("link");
      }}
      disabled={
        !focusedEditor || (focusedEditor?.editor.selection.empty && !isLink)
      }
      tooltipContent={
        <div className="text-accent-contrast underline">Inline Link</div>
      }
    >
      <LinkSmall />
    </ToolbarButton>
  );
}

export function InlineLinkToolbar(props: { onClose: () => void }) {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  let { undoManager } = useReplicache();
  useEffect(() => {
    if (focusedEditor) {
      let isLink;
      let { to, from, $cursor } = focusedEditor.editor
        .selection as TextSelection;
      if ($cursor) isLink = !!schema.marks.link.isInSet($cursor.marks());
      if (to !== from)
        isLink = !!rangeHasMark(
          focusedEditor.editor,
          schema.marks.link,
          from,
          to,
        );
      if (isLink) return;
    }
    if (focusedEditor?.editor.selection.empty) props.onClose();
  }, [focusedEditor, props]);
  let content = "";
  let start: number | null = null;
  let end: number | null = null;
  if (focusedEditor) {
    let { to, from, $cursor } = focusedEditor.editor.selection as TextSelection;
    if (to !== from) {
      start = from;
      end = to;
    } else {
      let markRange = findMarkRange(
        focusedEditor.editor.doc,
        schema.marks.link,
        from,
      );
      start = markRange.start;
      end = markRange.end;
    }
    if ($cursor) {
      let link = $cursor.marks().find((f) => f.type === schema.marks.link);
      if (link) {
        content = link.attrs.href;
      }
    }
  }
  let [linkValue, setLinkValue] = useState(content);
  let setLink = () => {
    let href = ensureProtocol(linkValue);

    let editor = focusedEditor?.editor;
    if (!editor || start === null || !end || !focusedBlock) return;
    let tr = editor.tr;
    tr.addMark(start, end, schema.marks.link.create({ href }));
    tr.setSelection(TextSelection.create(tr.doc, tr.selection.to));

    let oldState = editor;
    let newState = editor.apply(tr);
    undoManager.add({
      undo: () => {
        if (!focusedEditor?.view?.hasFocus()) focusedEditor?.view?.focus();
        setEditorState(focusedBlock.entityID, {
          editor: oldState,
        });
      },
      redo: () => {
        if (!focusedEditor?.view?.hasFocus()) focusedEditor?.view?.focus();
        setEditorState(focusedBlock.entityID, {
          editor: newState,
        });
      },
    });
    setEditorState(focusedBlock?.entityID, {
      editor: newState,
    });
    props.onClose();
  };

  return (
    <div className="w-full flex items-center gap-[6px]  grow">
      <LinkSmall />
      <Separator classname="h-6!" />
      <Input
        autoFocus
        className="w-full grow bg-transparent border-none outline-hidden "
        placeholder="www.example.com"
        value={linkValue}
        onChange={(e) => setLinkValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setLink();
          }
          if (e.key === "Escape") {
            props.onClose();
          }
        }}
      />
      {/*
        TODO:
        to avoid all sort of messiness, editing any portion of link will edit the
        entire range that includes the link rather than just the link text that is selected.

        ALSO TODO:
        if there is already a link mark, the input should be prefilled with the link value
        and the check mark should be a garbage can to remove the link.

        if the user changes the link, then the button reverts to a check mark.
        */}
      <div className="flex items-center gap-3 w-4">
        <button
          disabled={!linkValue || linkValue === ""}
          className="hover:text-accent-contrast -mr-6 disabled:text-border"
          onMouseDown={(e) => {
            e.preventDefault();
            setLink();
          }}
        >
          <CheckTiny />
        </button>
      </div>
    </div>
  );
}

