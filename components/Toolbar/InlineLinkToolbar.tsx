import { schema } from "components/Blocks/TextBlock/schema";
import { EditorState, TextSelection } from "prosemirror-state";
import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { CheckTiny, CloseTiny, LinkTextToolbarSmall } from "components/Icons";
import { useEffect, useState } from "react";
import { Separator } from "components/Layout";
import { MarkType } from "prosemirror-model";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { Input } from "components/Input";

export function LinkButton(props: { setToolbarState: (s: "link") => void }) {
  let focusedBlock = useUIState((s) => s.focusedBlock);
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
      disabled={focusedEditor?.editor.selection.empty || !focusedEditor}
      tooltipContent={
        <div className="text-accent-contrast underline">Inline Link</div>
      }
    >
      <LinkTextToolbarSmall />
    </ToolbarButton>
  );
}

export function InlineLinkToolbar(props: { onClose: () => void }) {
  let focusedBlock = useUIState((s) => s.focusedBlock);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  useEffect(() => {
    if (focusedEditor?.editor.selection.empty) props.onClose();
  }, [focusedEditor?.editor.selection.empty, props]);
  let content = "";
  let start: number | null = null;
  let end: number | null = null;
  if (focusedEditor) {
    let { to, from, $cursor } = focusedEditor.editor.selection as TextSelection;
    if (to !== from) {
      start = from;
      end = to;
    } else {
      let markRange = findMarkRange(focusedEditor.editor, schema.marks.link);
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

  return (
    <div className="w-full flex items-center gap-[6px]  grow">
      <LinkTextToolbarSmall />
      <Separator classname="h-6" />
      <Input
        autoFocus
        className="w-full grow bg-transparent border-none outline-none "
        placeholder="www.example.com"
        value={linkValue}
        onChange={(e) => setLinkValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            let editor = focusedEditor?.editor;
            if (!editor || !start || !end || !focusedBlock) return;
            let tr = editor.tr;
            tr.addMark(
              start,
              end,
              schema.marks.link.create({ href: linkValue }),
            );
            tr.setSelection(TextSelection.create(tr.doc, tr.selection.to));
            setEditorState(focusedBlock?.entityID, {
              editor: editor.apply(tr),
            });
            props.onClose();
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
      <div className="flex items-center gap-3">
        <button
          disabled={!linkValue || linkValue === ""}
          className="hover:text-accent-contrast -mr-6 disabled:text-border"
          onMouseDown={(e) => {
            e.preventDefault();
            let editor = focusedEditor?.editor;
            if (!editor || !start || !end || !focusedBlock) return;
            let tr = editor.tr;
            tr.addMark(
              start,
              end,
              schema.marks.link.create({ href: linkValue }),
            );
            setEditorState(focusedBlock?.entityID, {
              editor: editor.apply(tr),
            });
            props.onClose();
          }}
        >
          <CheckTiny />
        </button>
      </div>
    </div>
  );
}

function findMarkRange(state: EditorState, markType: MarkType) {
  const { from, $from } = state.selection;

  // Find the start of the mark
  let start = from;
  let startPos = $from;
  while (
    startPos.parent.inlineContent &&
    startPos.nodeBefore &&
    startPos.nodeBefore.marks.some((mark) => mark.type === markType)
  ) {
    start -= startPos.nodeBefore.nodeSize;
    startPos = state.doc.resolve(start);
  }

  // Find the end of the mark
  let end = from;
  let endPos = $from;
  while (
    endPos.parent.inlineContent &&
    endPos.nodeAfter &&
    endPos.nodeAfter.marks.some((mark) => mark.type === markType)
  ) {
    end += endPos.nodeAfter.nodeSize;
    endPos = state.doc.resolve(end);
  }

  return { start, end };
}
