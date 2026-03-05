import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { ySyncPlugin } from "y-prosemirror";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { schema } from "components/Blocks/TextBlock/schema";
import { useEntity, useReplicache } from "src/replicache";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { CloseTiny } from "components/Icons/CloseTiny";

export function FootnoteEditor(props: {
  footnoteEntityID: string;
  index: number;
  editable: boolean;
  onDelete?: () => void;
  autoFocus?: boolean;
}) {
  let mountRef = useRef<HTMLDivElement | null>(null);
  let rep = useReplicache();
  let value = useFootnoteYJS(props.footnoteEntityID);

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
          let newState = this.state.apply(tr);
          this.updateState(newState);
        },
      },
    );

    if (props.autoFocus) {
      setTimeout(() => view.focus(), 50);
    }

    return () => {
      view.destroy();
    };
  }, [props.footnoteEntityID, value, props.editable, props.autoFocus]);

  return (
    <div className="footnote-editor flex items-start gap-2 text-xs group/footnote" data-footnote-editor={props.footnoteEntityID}>
      <button
        className="text-accent-contrast font-medium shrink-0 text-xs leading-normal hover:underline cursor-pointer"
        onClick={() => {
          let ref = document.querySelector(
            `.footnote-ref[data-footnote-id="${props.footnoteEntityID}"]`,
          );
          if (ref) {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
        title="Jump to footnote in text"
      >
        {props.index}.
      </button>
      <div
        ref={mountRef}
        className="grow outline-hidden min-w-0 text-secondary [&_.ProseMirror]:outline-hidden"
        style={{ wordBreak: "break-word" }}
      />
      {props.editable && props.onDelete && (
        <button
          className="shrink-0 mt-0.5 text-tertiary hover:text-primary opacity-0 group-hover/footnote:opacity-100 transition-opacity"
          onClick={props.onDelete}
          title="Delete footnote"
        >
          <CloseTiny />
        </button>
      )}
    </div>
  );
}

function useFootnoteYJS(footnoteEntityID: string) {
  const [ydoc] = useState(new Y.Doc());
  const docState = useEntity(footnoteEntityID, "block/text");
  let rep = useReplicache();
  const [yText] = useState(ydoc.getXmlFragment("prosemirror"));

  if (docState) {
    const update = base64.toByteArray(docState.data.value);
    Y.applyUpdate(ydoc, update);
  }

  useEffect(() => {
    if (!rep.rep) return;
    let timeout = null as null | number;
    const updateReplicache = async () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      await rep.rep?.mutate.assertFact({
        ignoreUndo: true,
        entity: footnoteEntityID,
        attribute: "block/text",
        data: {
          value: base64.fromByteArray(update),
          type: "text",
        },
      });
    };
    const f = async (_events: Y.YEvent<any>[], transaction: Y.Transaction) => {
      if (!transaction.origin) return;
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(async () => {
        updateReplicache();
      }, 300);
    };

    yText.observeDeep(f);
    return () => {
      yText.unobserveDeep(f);
    };
  }, [yText, footnoteEntityID, rep, ydoc]);

  return yText;
}
