"use client";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { formattingKeymap } from "src/utils/prosemirror/formattingKeymap";
import { applyLinkPaste } from "src/utils/prosemirror/linkOnPaste";
import { multiBlockSchema } from "components/Blocks/TextBlock/schema";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Mark, MarkType, Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history, redo, undo } from "prosemirror-history";
import { InputRule, inputRules } from "prosemirror-inputrules";
import React, {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { setMark } from "src/utils/prosemirror/setMark";
import { isIOS } from "src/utils/isDevice";
import { betterIsUrl } from "src/utils/isURL";
import { Mention, MentionAutocomplete } from "components/Mention";
import { didToBlueskyUrl, atUriToUrl } from "src/utils/mentionUtils";
import {
  loadDraftDoc,
  saveDraftDoc,
} from "src/utils/prosemirror/draftPersistence";
import { docToFacetedText, type FacetedText } from "./facetedText";
export type { FacetedText } from "./facetedText";
import { BoldTiny } from "components/Icons/BoldTiny";
import { ItalicTiny } from "components/Icons/ItalicTiny";
import { StrikethroughTiny } from "components/Icons/StrikethroughTiny";

const addMentionToEditor = (
  mention: Mention,
  range: { from: number; to: number },
  view: EditorView,
) => {
  const { from, to } = range;
  const tr = view.state.tr;
  if (mention.type === "did") {
    tr.delete(from, to);
    const didMentionNode = multiBlockSchema.nodes.didMention.create({
      did: mention.did,
      text: "@" + mention.handle,
    });
    tr.insert(from, didMentionNode);
    tr.insertText(" ", from + 1);
  }
  if (mention.type === "publication" || mention.type === "post") {
    tr.delete(from, to);
    let name = mention.type === "post" ? mention.title : mention.name;
    const atMentionNode = multiBlockSchema.nodes.atMention.create({
      atURI: mention.uri,
      text: name,
    });
    tr.insert(from, atMentionNode);
    tr.insertText(" ", from + 1);
  }
  view.dispatch(tr);
  view.focus();
};

// A short rich-text input that produces plaintext + facets: bold, italic,
// strikethrough, links, and @-mentions, with Cmd-Enter to submit. Comments
// and questions share it.
export function FacetedTextComposer(props: {
  // Persists the in-progress text under this key across reloads; null
  // persists nothing.
  draftKey: string | null;
  // Seeds the editor instead of the persisted draft (editing a record).
  initialDoc?: Node;
  autoFocus?: boolean;
  submitLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onCancel?: () => void;
  // Resolves true to clear the input once the text is sent.
  onSubmit: (text: FacetedText) => Promise<boolean>;
  // Intercepts pasted plain text; returns true when handled.
  onPasteText?: (text: string) => boolean | void;
  // Rendered above the input
  above?: React.ReactNode;
  // Rendered beside the buttons
  trailing?: React.ReactNode;
  className?: string;
  inputClassName?: string;
}) {
  let mountRef = useRef<HTMLPreElement | null>(null);
  let view = useRef<null | EditorView>(null);
  let [submitting, setSubmitting] = useState(false);
  let onCancelRef = useRef(props.onCancel);
  onCancelRef.current = props.onCancel;
  let onPasteTextRef = useRef(props.onPasteText);
  onPasteTextRef.current = props.onPasteText;

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionCoords, setMentionCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const mentionInsertPosRef = useRef<number | null>(null);
  const openMentionAutocompleteRef = useRef<() => void>(() => {});
  openMentionAutocompleteRef.current = () => {
    if (!view.current) return;
    const pos = view.current.state.selection.from;
    mentionInsertPosRef.current = pos;
    const coords = view.current.coordsAtPos(pos - 1);
    const container = view.current.dom.closest(
      ".relative",
    ) as HTMLElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      setMentionCoords({
        top: coords.bottom - containerRect.top,
        left: coords.left - containerRect.left,
      });
    } else {
      setMentionCoords({ top: coords.bottom, left: coords.left });
    }
    setMentionOpen(true);
  };

  const handleMentionSelect = useCallback((mention: Mention) => {
    if (!view.current || mentionInsertPosRef.current === null) return;
    const from = mentionInsertPosRef.current - 1;
    const to = mentionInsertPosRef.current;
    addMentionToEditor(mention, { from, to }, view.current);
    view.current.focus();
  }, []);

  const handleMentionOpenChange = useCallback((open: boolean) => {
    setMentionOpen(open);
    if (!open) {
      setMentionCoords(null);
      mentionInsertPosRef.current = null;
    }
  }, []);

  const handleSubmitRef = useRef<() => Promise<void>>(async () => {});
  handleSubmitRef.current = async () => {
    if (submitting || !view.current) return;
    setSubmitting(true);
    let currentState = view.current.state;
    let clear = false;
    try {
      clear = await props.onSubmit(docToFacetedText(currentState.doc));
    } finally {
      setSubmitting(false);
    }
    if (clear && view.current) {
      let tr = currentState.tr;
      tr = tr.replaceWith(
        0,
        currentState.doc.content.size,
        multiBlockSchema.nodes.paragraph.createAndFill()!,
      );
      view.current.dispatch(tr);
    }
  };

  let [editorState, setEditorState] = useState(() => {
    let savedDoc = loadDraftDoc(props.draftKey);
    let doc: Node | undefined = props.initialDoc;
    if (!doc && savedDoc) {
      try {
        doc = multiBlockSchema.nodeFromJSON(savedDoc);
      } catch {
        doc = undefined;
      }
    }
    return EditorState.create({
      schema: multiBlockSchema,
      doc,
      plugins: [
        keymap({
          ...formattingKeymap(multiBlockSchema.marks),
          "Mod-z": undo,
          "Mod-y": redo,
          "Shift-Mod-z": redo,
          "Ctrl-Enter": () => {
            handleSubmitRef.current();
            return true;
          },
          "Meta-Enter": () => {
            handleSubmitRef.current();
            return true;
          },
          Escape: () => {
            if (!onCancelRef.current) return false;
            onCancelRef.current();
            return true;
          },
        }),
        keymap(baseKeymap),
        autolink({
          type: multiBlockSchema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
        inputRules({
          rules: [
            // @ at start of line or after space
            new InputRule(/(?:^|\s)@$/, () => {
              setTimeout(() => openMentionAutocompleteRef.current(), 0);
              return null;
            }),
          ],
        }),
        history(),
      ],
    });
  });
  let draftKey = props.draftKey;
  useLayoutEffect(() => {
    if (!mountRef.current) return;
    view.current = new EditorView(
      { mount: mountRef.current },
      {
        state: editorState,
        handlePaste: (view, e) => {
          let text =
            e.clipboardData?.getData("text") ||
            e.clipboardData?.getData("text/html");
          let html = e.clipboardData?.getData("text/html");
          if (text && betterIsUrl(text))
            return applyLinkPaste(view, multiBlockSchema.marks.link, text);
          if (!text && html) {
            let xml = new DOMParser().parseFromString(html, "text/html");
            text = xml.textContent || "";
          }
          if (text && onPasteTextRef.current?.(text)) return true;
        },
        handleClickOn: (view, _pos, node, _nodePos, _event, direct) => {
          if (!direct) return;
          if (node.nodeSize - 2 <= _pos) return;
          const nodeAt1 = node.nodeAt(_pos - 1);
          const nodeAt2 = node.nodeAt(Math.max(_pos - 2, 0));
          let mark =
            nodeAt1?.marks.find(
              (f) => f.type === multiBlockSchema.marks.link,
            ) ||
            nodeAt2?.marks.find((f) => f.type === multiBlockSchema.marks.link);
          if (mark) {
            window.open(mark.attrs.href, "_blank");
            return;
          }
          for (let n of [nodeAt1, nodeAt2]) {
            if (n?.type === multiBlockSchema.nodes.didMention) {
              window.open(
                didToBlueskyUrl(n.attrs.did),
                "_blank",
                "noopener,noreferrer",
              );
              return;
            }
            if (n?.type === multiBlockSchema.nodes.atMention) {
              window.open(
                atUriToUrl(n.attrs.atURI),
                "_blank",
                "noopener,noreferrer",
              );
              return;
            }
          }
        },
        dispatchTransaction(tr) {
          let newState = this.state.apply(tr);
          setEditorState(newState);
          view.current?.updateState(newState);
          saveDraftDoc(
            draftKey,
            newState.doc.textContent.length === 0
              ? null
              : newState.doc.toJSON(),
          );
        },
      },
    );
    if (props.autoFocus) view.current.focus();
    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, []);

  return (
    <div className={`flex flex-col grow ${props.className ?? ""}`}>
      {props.above}
      <div className="commentComposer w-full relative group">
        <pre
          ref={mountRef}
          style={{ fontFamily: "inherit" }}
          onFocus={() => handleMentionOpenChange(false)}
          onBlur={(e) => {
            // Keep the dropdown when focus moved into it
            const relatedTarget = e.relatedTarget as HTMLElement | null;
            if (!relatedTarget?.closest(".dropdownMenu"))
              handleMentionOpenChange(false);
          }}
          className={`commentInput border whitespace-pre-wrap input-with-border min-h-32 h-fit px-2! py-[6px]! ${props.inputClassName ?? ""}`}
        />
        <IOSBS view={view} />
        <MentionAutocomplete
          open={mentionOpen}
          onOpenChange={handleMentionOpenChange}
          view={view}
          onSelect={handleMentionSelect}
          coords={mentionCoords}
        />
      </div>
      <div className="flex justify-between pt-1">
        <div className="flex gap-1">
          <TextDecorationButton
            mark={multiBlockSchema.marks.strong}
            icon={<BoldTiny />}
            editor={editorState}
            view={view}
          />
          <TextDecorationButton
            mark={multiBlockSchema.marks.em}
            icon={<ItalicTiny />}
            editor={editorState}
            view={view}
          />
          <TextDecorationButton
            mark={multiBlockSchema.marks.strikethrough}
            icon={<StrikethroughTiny />}
            editor={editorState}
            view={view}
          />
        </div>
        <div className="flex items-center gap-2">
          {props.trailing}
          {props.onCancel && props.cancelLabel && (
            <ButtonTertiary compact onClick={() => props.onCancel?.()}>
              {props.cancelLabel}
            </ButtonTertiary>
          )}
          <ButtonPrimary
            compact
            disabled={submitting}
            onClick={() => handleSubmitRef.current()}
          >
            {submitting ? <DotLoader /> : props.submitLabel}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}

// Same footprint as the composer (input + toolbar row) so what's below
// doesn't jump while the viewer's identity or the editor chunk is loading.
export function ComposerPlaceholder(props: { className?: string }) {
  return (
    <div className="flex flex-col grow">
      <div
        className={`border input-with-border min-h-32 px-2 py-[6px] ${props.className ?? ""}`}
      />
      <div className="pt-1 h-[30px]" />
    </div>
  );
}

export function IOSBS(props: { view: RefObject<EditorView | null> }) {
  let [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);
  if (initialRender || !isIOS()) return null;
  return (
    <div
      className="h-full w-full absolute top-0 cursor-text group-focus-within:hidden"
      onPointerUp={(e) => {
        if (!props.view.current) return;
        e.preventDefault();
        let pos = props.view.current.posAtCoords({
          top: e.clientY,
          left: e.clientX,
        });
        let tr = props.view.current.state.tr;
        props.view.current.dispatch(
          tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 1)),
        );
        props.view.current.focus();
      }}
    />
  );
}

function TextDecorationButton(props: {
  editor: EditorState;
  mark: MarkType;
  icon: React.ReactNode;
  view: RefObject<EditorView | null>;
}) {
  let hasMark: boolean = false;
  let mark: Mark | null = null;
  if (props.editor) {
    let { to, from, $cursor } = props.editor.selection as TextSelection;
    mark = rangeHasMark(props.editor, props.mark, from, to);
    if ($cursor)
      hasMark = !!props.mark.isInSet(
        props.editor.storedMarks || $cursor.marks(),
      );
    else hasMark = !!mark;
  }
  return (
    <button
      className={`rounded-md hover:bg-border-light p-1 ${hasMark ? "bg-border-light text-primary" : "text-border"}`}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!props.view.current) return;
        toggleMarkInComposer(props.view.current, props.mark);
      }}
    >
      {props.icon}
    </button>
  );
}

function toggleMarkInComposer(view: EditorView, markT: MarkType, attrs?: any) {
  let { to, from, $cursor } = view.state.selection as TextSelection;
  let mark = rangeHasMark(view.state, markT, from, to);
  if (
    to === from &&
    markT?.isInSet(view.state.storedMarks || $cursor?.marks() || [])
  ) {
    return toggleMark(markT, attrs)(view.state, view.dispatch);
  }
  if (
    mark &&
    (!attrs || JSON.stringify(attrs) === JSON.stringify(mark.attrs))
  ) {
    toggleMark(markT, attrs)(view.state, view.dispatch);
  } else setMark(markT, attrs)(view.state, view.dispatch);
}
