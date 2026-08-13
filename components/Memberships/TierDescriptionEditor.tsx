"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { MarkType, Node, Schema } from "prosemirror-model";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history, redo, undo } from "prosemirror-history";
import { schema as blockSchema } from "components/Blocks/TextBlock/schema";
import { formattingKeymap } from "src/utils/prosemirror/formattingKeymap";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { betterIsUrl } from "src/utils/isURL";
import {
  BoldSmall,
  ItalicSmall,
  StrikethroughSmall,
} from "components/Toolbar/TextToolbar";
import { parseTierDescriptionDoc } from "src/utils/tierDescriptionDoc";

// Multi-paragraph text with the basic formatting marks and nothing
// block-level. Specs are borrowed from the block editor's schema so pasted
// rich text parses the same way it does there.
const tierSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: blockSchema.spec.nodes.get("paragraph")!,
    text: blockSchema.spec.nodes.get("text")!,
    hard_break: blockSchema.spec.nodes.get("hard_break")!,
  },
  marks: {
    strong: blockSchema.spec.marks.get("strong")!,
    em: blockSchema.spec.marks.get("em")!,
    underline: blockSchema.spec.marks.get("underline")!,
    strikethrough: blockSchema.spec.marks.get("strikethrough")!,
    link: blockSchema.spec.marks.get("link")!,
  },
});

function initialDocFromValue(value: string | null): Node | undefined {
  if (!value) return undefined;
  let parsed = parseTierDescriptionDoc(value);
  if (parsed) {
    try {
      return tierSchema.nodeFromJSON(parsed);
    } catch {}
  }
  return tierSchema.nodeFromJSON({
    type: "doc",
    content: value.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  });
}

// A rich-text replacement for a description textarea. Emits the doc as a JSON
// string (or null once emptied) on every edit; see src/utils/tierDescriptionDoc.
export function TierDescriptionEditor(props: {
  label: string;
  initialValue: string | null;
  placeholder?: string;
  onChange: (value: string | null) => void;
}) {
  let mountRef = useRef<HTMLDivElement | null>(null);
  let viewRef = useRef<EditorView | null>(null);
  let [editorState, setEditorState] = useState<EditorState | null>(null);

  // The editor is uncontrolled after mount; keep the latest callback without
  // remounting the view when the parent re-renders.
  let onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  let initialValueRef = useRef(props.initialValue);

  useLayoutEffect(() => {
    if (!mountRef.current) return;

    let state = EditorState.create({
      schema: tierSchema,
      doc: initialDocFromValue(initialValueRef.current),
      plugins: [
        keymap({
          ...formattingKeymap(tierSchema.marks),
          "Mod-z": undo,
          "Mod-y": redo,
          "Shift-Mod-z": redo,
          "Shift-Enter": (state, dispatch) => {
            if (dispatch)
              dispatch(
                state.tr
                  .replaceSelectionWith(tierSchema.nodes.hard_break.create())
                  .scrollIntoView(),
              );
            return true;
          },
        }),
        keymap(baseKeymap),
        autolink({
          type: tierSchema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
        history(),
      ],
    });

    let view = new EditorView(
      { mount: mountRef.current },
      {
        state,
        handlePaste: (view, e) => {
          let text = e.clipboardData?.getData("text");
          if (text && betterIsUrl(text)) {
            let selection = view.state.selection as TextSelection;
            let tr = view.state.tr;
            let { from, to } = selection;
            if (selection.empty) {
              tr.insertText(text, from);
              tr.addMark(
                from,
                from + text.length,
                tierSchema.marks.link.create({ href: text }),
              );
            } else {
              tr.addMark(from, to, tierSchema.marks.link.create({ href: text }));
            }
            view.dispatch(tr);
            return true;
          }
        },
        dispatchTransaction(tr) {
          let newState = view.state.apply(tr);
          view.updateState(newState);
          setEditorState(newState);
          if (tr.docChanged)
            onChangeRef.current(
              newState.doc.textContent.trim() === ""
                ? null
                : JSON.stringify(newState.doc.toJSON()),
            );
        },
      },
    );
    viewRef.current = view;
    setEditorState(view.state);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return (
    <div className="input-with-border flex flex-col gap-px text-sm leading-tight py-1! px-[6px]!">
      <div className="flex justify-between items-center">
        <div className="text-tertiary font-bold italic">{props.label}</div>
        <div className="flex gap-0.5">
          <MarkButton
            label="Bold"
            mark={tierSchema.marks.strong}
            editorState={editorState}
            viewRef={viewRef}
            icon={<BoldSmall className="w-5 h-5" />}
          />
          <MarkButton
            label="Italic"
            mark={tierSchema.marks.em}
            editorState={editorState}
            viewRef={viewRef}
            icon={<ItalicSmall className="w-5 h-5" />}
          />
          <MarkButton
            label="Strikethrough"
            mark={tierSchema.marks.strikethrough}
            editorState={editorState}
            viewRef={viewRef}
            icon={<StrikethroughSmall className="w-5 h-5" />}
          />
        </div>
      </div>
      <div
        className="relative cursor-text"
        onMouseDown={(e) => {
          // Focus when the padding around the ProseMirror div is clicked.
          if (e.target === e.currentTarget) {
            e.preventDefault();
            viewRef.current?.focus();
          }
        }}
      >
        {props.placeholder && editorState?.doc.textContent.length === 0 && (
          <div className="absolute top-0 left-0 pointer-events-none text-base font-normal not-italic text-tertiary opacity-50">
            {props.placeholder}
          </div>
        )}
        <div
          ref={mountRef}
          className="outline-hidden min-h-14 whitespace-pre-wrap font-normal not-italic text-base text-primary"
        />
      </div>
    </div>
  );
}

function MarkButton(props: {
  label: string;
  mark: MarkType;
  icon: React.ReactNode;
  editorState: EditorState | null;
  viewRef: React.RefObject<EditorView | null>;
}) {
  let active = props.editorState
    ? isMarkActive(props.editorState, props.mark)
    : false;
  return (
    <button
      type="button"
      title={props.label}
      className={`flex items-center rounded-md border border-transparent not-italic ${
        active
          ? "bg-border-light text-primary"
          : "text-secondary hover:text-primary hover:border-border active:bg-border-light active:text-primary"
      }`}
      // mousedown instead of click so the editor selection isn't blurred away
      // before the mark applies
      onMouseDown={(e) => {
        e.preventDefault();
        let view = props.viewRef.current;
        if (!view) return;
        toggleMark(props.mark)(view.state, view.dispatch);
        view.focus();
      }}
    >
      {props.icon}
    </button>
  );
}

function isMarkActive(state: EditorState, mark: MarkType) {
  let { from, to, $cursor } = state.selection as TextSelection;
  if ($cursor) return !!mark.isInSet(state.storedMarks || $cursor.marks());
  return !!rangeHasMark(state, mark, from, to);
}
