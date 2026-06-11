"use client";

import { useLayoutEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { ySyncPlugin } from "y-prosemirror";
import { schema } from "components/Blocks/TextBlock/schema";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { betterIsUrl } from "src/utils/isURL";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { Avatar } from "components/Avatar";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";

// A local-only editor for drafting comments and replies. The YJS doc lives in
// component state and is never written to Replicache while drafting; the
// encoded doc is handed to onSubmit only when the user hits submit.
export function CommentComposer(props: {
  onSubmit: (ydoc: Y.Doc) => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
}) {
  let mountRef = useRef<HTMLDivElement | null>(null);
  let viewRef = useRef<EditorView | null>(null);
  let [ydoc] = useState(() => new Y.Doc());
  let [empty, setEmpty] = useState(true);
  let { identity } = useIdentityData();
  let { data: profile } = useRecordFromDid(identity?.atp_did);

  let onSubmitRef = useRef(props.onSubmit);
  onSubmitRef.current = props.onSubmit;
  let submit = async () => {
    let view = viewRef.current;
    if (!view || view.state.doc.textContent.trim() === "") return;
    await onSubmitRef.current(ydoc);
  };
  let submitRef = useRef(submit);
  submitRef.current = submit;

  useLayoutEffect(() => {
    if (!mountRef.current) return;
    let fragment = ydoc.getXmlFragment("prosemirror");

    let plugins = [
      ySyncPlugin(fragment),
      keymap({
        "Mod-b": toggleMark(schema.marks.strong),
        "Mod-i": toggleMark(schema.marks.em),
        "Mod-u": toggleMark(schema.marks.underline),
        "Ctrl-Meta-x": toggleMark(schema.marks.strikethrough),
        "Shift-Enter": (state, dispatch) => {
          let hardBreak = schema.nodes.hard_break.create();
          if (dispatch) {
            dispatch(state.tr.replaceSelectionWith(hardBreak).scrollIntoView());
          }
          return true;
        },
        "Mod-Enter": () => {
          submitRef.current();
          return true;
        },
        Enter: (state, dispatch) => {
          let hardBreak = schema.nodes.hard_break.create();
          if (dispatch) {
            dispatch(state.tr.replaceSelectionWith(hardBreak).scrollIntoView());
          }
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
        dispatchTransaction(this: EditorView, tr) {
          let newState = this.state.apply(tr);
          this.updateState(newState);
          setEmpty(newState.doc.textContent.trim() === "");
        },
      },
    );
    viewRef.current = view;

    if (props.autoFocus) {
      setTimeout(() => view.focus(), 50);
    }

    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc]);

  return (
    <div className="commentComposer flex flex-col gap-2">
      <div className="flex gap-2 items-start">
        {profile && (
          <Avatar
            src={profile.avatar}
            displayName={profile.displayName || profile.handle}
            size="small"
          />
        )}
        <div className="grow min-w-0 relative text-sm text-primary">
          {empty && (
            <div className="absolute top-0 left-0 text-tertiary italic pointer-events-none">
              {props.placeholder || "Add a comment..."}
            </div>
          )}
          <div
            ref={mountRef}
            className="outline-hidden [&_.ProseMirror]:outline-hidden min-h-[1.5em]"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end items-center">
        {props.onCancel && (
          <ButtonTertiary compact type="button" onClick={props.onCancel}>
            Cancel
          </ButtonTertiary>
        )}
        <ButtonPrimary
          compact
          type="button"
          disabled={empty}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => submit()}
        >
          {props.submitLabel || "Submit"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
