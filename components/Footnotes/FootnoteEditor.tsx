import { useLayoutEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { ySyncPlugin } from "y-prosemirror";
import { schema } from "components/Blocks/TextBlock/schema";
import { useReplicache } from "src/replicache";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import {
  useYJSValue,
  trackUndoRedo,
} from "components/Blocks/TextBlock/mountProsemirror";
import { CloseTiny } from "components/Icons/CloseTiny";
import { FootnoteItemLayout } from "./FootnoteItemLayout";

export function FootnoteEditor(props: {
  footnoteEntityID: string;
  index: number;
  editable: boolean;
  onDelete?: () => void;
  autoFocus?: boolean;
}) {
  let mountRef = useRef<HTMLDivElement | null>(null);
  let rep = useReplicache();
  let value = useYJSValue(props.footnoteEntityID);
  let actionTimeout = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!mountRef.current || !value) return;

    let plugins = [
      ySyncPlugin(value),
      keymap({
        "Meta-b": toggleMark(schema.marks.strong),
        "Ctrl-b": toggleMark(schema.marks.strong),
        "Meta-u": toggleMark(schema.marks.underline),
        "Ctrl-u": toggleMark(schema.marks.underline),
        "Meta-i": toggleMark(schema.marks.em),
        "Ctrl-i": toggleMark(schema.marks.em),
        "Shift-Enter": (state, dispatch) => {
          let hardBreak = schema.nodes.hard_break.create();
          if (dispatch) {
            dispatch(
              state.tr.replaceSelectionWith(hardBreak).scrollIntoView(),
            );
          }
          return true;
        },
        Enter: (_state, _dispatch, view) => {
          view?.dom.blur();
          return true;
        },
      }),
      keymap(baseKeymap),
      autolink({
        type: schema.marks.link,
        shouldAutoLink: () => true,
        defaultProtocol: "https",
      }),
    ];

    let state = EditorState.create({ schema, plugins });
    let view = new EditorView(
      { mount: mountRef.current },
      {
        state,
        editable: () => props.editable,
        dispatchTransaction(this: EditorView, tr) {
          let oldState = this.state;
          let newState = this.state.apply(tr);
          this.updateState(newState);

          trackUndoRedo(
            tr,
            rep.undoManager,
            actionTimeout,
            () => {
              this.focus();
              this.updateState(oldState);
            },
            () => {
              this.focus();
              this.updateState(newState);
            },
          );
        },
      },
    );

    if (props.autoFocus) {
      setTimeout(() => view.focus(), 50);
    }

    return () => {
      view.destroy();
    };
  }, [props.footnoteEntityID, value, props.editable, props.autoFocus, rep.undoManager]);

  return (
    <FootnoteItemLayout
      index={props.index}
      indexAction={() => {
        let ref = document.querySelector(
          `.footnote-ref[data-footnote-id="${props.footnoteEntityID}"]`,
        );
        if (ref) {
          ref.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }}
      trailing={
        props.editable && props.onDelete ? (
          <button
            className="shrink-0 mt-0.5 text-tertiary hover:text-primary opacity-0 group-hover/footnote:opacity-100 transition-opacity"
            onClick={props.onDelete}
            title="Delete footnote"
          >
            <CloseTiny />
          </button>
        ) : undefined
      }
    >
      <div
        ref={mountRef}
        className="outline-hidden"
      />
    </FootnoteItemLayout>
  );
}

