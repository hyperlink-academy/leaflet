"use client";

import { useLayoutEffect, useRef, useState } from "react";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { prosemirrorToYDoc, yDocToProsemirror } from "y-prosemirror";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { schema } from "components/Blocks/TextBlock/schema";
import { stripCommentMarks } from "components/Blocks/TextBlock/stripCommentMarks";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { formattingKeymap } from "src/utils/prosemirror/formattingKeymap";
import { applyLinkPaste } from "src/utils/prosemirror/linkOnPaste";
import { betterIsUrl } from "src/utils/isURL";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { useIdentityData } from "components/IdentityProvider";
import { EditorCommentMessageLayout } from "./EditorCommentMessageLayout";

// A local-only editor for drafting comments and replies. The draft is plain
// ProseMirror state and is never written to Replicache; it's converted to a
// Y.Doc (the stored comment format) and handed to onSubmit only when the
// user hits submit.
export function EditorCommentComposer(props: {
  onSubmit: (ydoc: Y.Doc) => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  // base64-encoded YJS state to seed the editor with when editing an
  // existing comment; the doc is decoded back into a ProseMirror document
  initialContent?: string;
  // Called on unmount with the current draft as base64-encoded YJS state (or
  // null when empty), so a persistent composer can stash an unsent draft
  onPersistDraft?: (content: string | null) => void;
}) {
  let mountRef = useRef<HTMLDivElement | null>(null);
  let viewRef = useRef<EditorView | null>(null);
  let [empty, setEmpty] = useState(true);
  let { identity } = useIdentityData();

  // Set up inside the effect, where the plugins are in scope; resets the
  // editor to an empty doc so a persistent composer (e.g. the reply box)
  // doesn't keep the just-submitted text around
  let clearRef = useRef<() => void>(() => {});

  let onSubmitRef = useRef(props.onSubmit);
  onSubmitRef.current = props.onSubmit;
  let onPersistDraftRef = useRef(props.onPersistDraft);
  onPersistDraftRef.current = props.onPersistDraft;
  let submit = async () => {
    let view = viewRef.current;
    if (!view || view.state.doc.textContent.trim() === "") return;
    await onSubmitRef.current(prosemirrorToYDoc(view.state.doc));
    clearRef.current();
  };
  let submitRef = useRef(submit);
  submitRef.current = submit;

  useLayoutEffect(() => {
    if (!mountRef.current) return;

    // Enter submits; Shift-Enter (and Mod-Enter) insert a line break
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
        "Mod-Enter": insertHardBreak,
        Enter: () => {
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

    let doc: ReturnType<typeof yDocToProsemirror> | undefined;
    if (props.initialContent) {
      let ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, base64.toByteArray(props.initialContent));
      doc = yDocToProsemirror(schema, ydoc);
    }
    let state = EditorState.create({ schema, doc, plugins });
    let view = new EditorView(
      { mount: mountRef.current },
      {
        state,
        transformPasted: stripCommentMarks,
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
    clearRef.current = () => {
      view.updateState(EditorState.create({ schema, plugins }));
      setEmpty(true);
    };
    setEmpty(state.doc.textContent.trim() === "");

    if (props.autoFocus) {
      setTimeout(() => view.focus(), 50);
    }

    return () => {
      // Stash whatever's left in the editor before it's torn down, so a draft
      // survives the popover/drawer closing
      if (onPersistDraftRef.current) {
        let empty = view.state.doc.textContent.trim() === "";
        onPersistDraftRef.current(
          empty
            ? null
            : base64.fromByteArray(
                Y.encodeStateAsUpdate(prosemirrorToYDoc(view.state.doc)),
              ),
        );
      }
      viewRef.current = null;
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="editorCommentComposer flex flex-col gap-2">
      <EditorCommentMessageLayout did={identity?.atp_did}>
        {empty && (
          <div className="absolute top-0 left-5 text-tertiary italic pointer-events-none">
            {props.placeholder || "Add a comment..."}
          </div>
        )}
        <div
          ref={mountRef}
          className="outline-hidden [&_.ProseMirror]:outline-hidden min-h-[1.5em]"
        />
      </EditorCommentMessageLayout>
      <div className="flex gap-2 justify-end items-center">
        {props.onCancel && (
          <ButtonTertiary
            compact
            type="button"
            className="text-sm"
            onClick={() => {
              clearRef.current();
              props.onCancel?.();
            }}
          >
            Cancel
          </ButtonTertiary>
        )}
        <ButtonPrimary
          compact
          type="button"
          className="text-sm"
          disabled={empty}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => submit()}
        >
          {props.submitLabel || "Comment"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
