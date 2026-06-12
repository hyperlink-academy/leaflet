"use client";

import { useLayoutEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { prosemirrorToYDoc } from "y-prosemirror";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { schema } from "components/Blocks/TextBlock/schema";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { formattingKeymap } from "src/utils/prosemirror/formattingKeymap";
import { applyLinkPaste } from "src/utils/prosemirror/linkOnPaste";
import { betterIsUrl } from "src/utils/isURL";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { Avatar } from "components/Avatar";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";

// A local-only editor for drafting comments and replies. The draft is plain
// ProseMirror state and is never written to Replicache; it's converted to a
// Y.Doc (the stored comment format) and handed to onSubmit only when the
// user hits submit.
export function CommentComposer(props: {
  onSubmit: (ydoc: Y.Doc) => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
}) {
  let mountRef = useRef<HTMLDivElement | null>(null);
  let viewRef = useRef<EditorView | null>(null);
  let [empty, setEmpty] = useState(true);
  let { identity } = useIdentityData();
  let { data: profile } = useRecordFromDid(identity?.atp_did);

  let onSubmitRef = useRef(props.onSubmit);
  onSubmitRef.current = props.onSubmit;
  let submit = async () => {
    let view = viewRef.current;
    if (!view || view.state.doc.textContent.trim() === "") return;
    await onSubmitRef.current(prosemirrorToYDoc(view.state.doc));
  };
  let submitRef = useRef(submit);
  submitRef.current = submit;

  useLayoutEffect(() => {
    if (!mountRef.current) return;

    // Both Enter and Shift-Enter insert a line break; Mod-Enter submits
    let insertHardBreak = (
      state: EditorState,
      dispatch?: (tr: typeof state.tr) => void,
    ) => {
      let hardBreak = schema.nodes.hard_break.create();
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(hardBreak).scrollIntoView());
      }
      return true;
    };

    let plugins = [
      keymap({
        ...formattingKeymap(schema.marks),
        "Shift-Enter": insertHardBreak,
        Enter: insertHardBreak,
        "Mod-Enter": () => {
          submitRef.current();
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
          if (text && betterIsUrl(text))
            return applyLinkPaste(view, schema.marks.link, text);
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
  }, []);

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
