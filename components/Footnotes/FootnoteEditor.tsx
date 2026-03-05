import { useLayoutEffect, useRef } from "react";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { ySyncPlugin } from "y-prosemirror";
import { schema } from "components/Blocks/TextBlock/schema";
import { useReplicache } from "src/replicache";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { betterIsUrl } from "src/utils/isURL";
import {
  useYJSValue,
  trackUndoRedo,
} from "components/Blocks/TextBlock/mountProsemirror";
import { CloseTiny } from "components/Icons/CloseTiny";
import { FootnoteItemLayout } from "./FootnoteItemLayout";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useFootnoteContext } from "./FootnoteContext";

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
  let { pageID } = useFootnoteContext();

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
        handlePaste: (view, e) => {
          let text = e.clipboardData?.getData("text");
          if (text && betterIsUrl(text)) {
            let selection = view.state.selection as TextSelection;
            let tr = view.state.tr;
            let { from, to } = selection;
            if (selection.empty) {
              tr.insertText(text, selection.from);
              tr.addMark(
                from,
                from + text.length,
                schema.marks.link.create({ href: text }),
              );
            } else {
              tr.addMark(from, to, schema.marks.link.create({ href: text }));
            }
            view.dispatch(tr);
            return true;
          }
        },
        handleClickOn: (_view, _pos, node, _nodePos, _event, direct) => {
          if (!direct) return;
          if (node.nodeSize - 2 <= _pos) return;
          const nodeAt1 = node.nodeAt(_pos - 1);
          const nodeAt2 = node.nodeAt(Math.max(_pos - 2, 0));
          let linkMark =
            nodeAt1?.marks.find((f) => f.type === schema.marks.link) ||
            nodeAt2?.marks.find((f) => f.type === schema.marks.link);
          if (linkMark) {
            window.open(linkMark.attrs.href, "_blank");
            return;
          }
        },
        dispatchTransaction(this: EditorView, tr) {
          let oldState = this.state;
          let newState = this.state.apply(tr);
          this.updateState(newState);

          useEditorStates.setState((s) => ({
            editorStates: {
              ...s.editorStates,
              [props.footnoteEntityID]: {
                editor: newState,
                view: this,
              },
            },
          }));

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

    // Register editor state
    useEditorStates.setState((s) => ({
      editorStates: {
        ...s.editorStates,
        [props.footnoteEntityID]: {
          editor: view.state,
          view,
        },
      },
    }));

    // Subscribe to external state changes (e.g. link toolbar)
    let unsubscribe = useEditorStates.subscribe((s) => {
      let editorState = s.editorStates[props.footnoteEntityID];
      if (editorState?.editor)
        editorState.view?.updateState(editorState.editor);
    });

    // Set focusedEntity on focus
    let handleFocus = () => {
      useUIState.setState({
        focusedEntity: {
          entityType: "footnote",
          entityID: props.footnoteEntityID,
          parent: pageID,
        },
      });
    };
    view.dom.addEventListener("focus", handleFocus);

    if (props.autoFocus) {
      setTimeout(() => view.focus(), 50);
    }

    return () => {
      unsubscribe();
      view.dom.removeEventListener("focus", handleFocus);
      view.destroy();
      useEditorStates.setState((s) => {
        let { [props.footnoteEntityID]: _, ...rest } = s.editorStates;
        return { editorStates: rest };
      });
    };
  }, [props.footnoteEntityID, value, props.editable, props.autoFocus, rep.undoManager, pageID]);

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

