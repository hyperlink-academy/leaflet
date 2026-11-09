"use client";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { formattingKeymap } from "src/utils/prosemirror/formattingKeymap";
import { applyLinkPaste } from "src/utils/prosemirror/linkOnPaste";
import { multiBlockSchema } from "components/Blocks/TextBlock/schema";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Node } from "prosemirror-model";
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
import { ComposerChrome } from ".";
import { isIOS } from "src/utils/isDevice";
import { betterIsUrl } from "src/utils/isURL";
import { Mention, MentionAutocomplete } from "components/Mention";
import { didToBlueskyUrl, atUriToUrl } from "src/utils/mentionUtils";
import {
  loadDraftDoc,
  saveDraftDoc,
} from "src/utils/prosemirror/draftPersistence";
export type { FacetedText } from "./facetedText";

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

// A short rich-text input in the ComposerChrome: paragraphs with bold,
// italic, strikethrough and links, and optionally @-mentions. Comments,
// questions and tier descriptions use it; each turns the document into what
// it stores (see facetedText.ts).
export function TextComposer(props: {
  // Persists the in-progress text under this key across reloads; null or
  // unset persists nothing.
  draftKey?: string | null;
  // Seeds the editor instead of the persisted draft (editing a record).
  initialDoc?: Node;
  placeholder?: string;
  // @ opens a picker of people, publications and posts
  mentions?: boolean;
  autoFocus?: boolean;
  // No box around the input, for a composer inside a container of its own
  bare?: boolean;
  onChange?: (doc: Node) => void;
  // Sends the text, on Cmd-Enter or a ComposerSubmit among the actions.
  // Resolves true to clear the input once the text is sent.
  onSubmit?: (doc: Node) => Promise<boolean>;
  // On Escape
  onCancel?: () => void;
  // Intercepts pasted plain text; returns true when handled.
  onPasteText?: (text: string) => boolean | void;
  // Rendered above the input
  above?: React.ReactNode;
  // Opposite the formatting buttons
  actions?: React.ReactNode;
  className?: string;
  inputClassName?: string;
}) {
  let mountRef = useRef<HTMLPreElement | null>(null);
  let view = useRef<null | EditorView>(null);
  // Mirrors `view` for rendering: the formatting buttons need it once mounted
  let [mountedView, setMountedView] = useState<EditorView | null>(null);
  let [submitting, setSubmitting] = useState(false);
  let onCancelRef = useRef(props.onCancel);
  onCancelRef.current = props.onCancel;
  let onPasteTextRef = useRef(props.onPasteText);
  onPasteTextRef.current = props.onPasteText;
  let onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

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
    if (submitting || !view.current || !props.onSubmit) return;
    setSubmitting(true);
    let currentState = view.current.state;
    let clear = false;
    try {
      clear = await props.onSubmit(currentState.doc);
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
        ...(props.mentions
          ? [
              inputRules({
                rules: [
                  // @ at start of line or after space
                  new InputRule(/(?:^|\s)@$/, () => {
                    setTimeout(() => openMentionAutocompleteRef.current(), 0);
                    return null;
                  }),
                ],
              }),
            ]
          : []),
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
          if (tr.docChanged) onChangeRef.current?.(newState.doc);
        },
      },
    );
    setMountedView(view.current);
    return () => {
      view.current?.destroy();
      view.current = null;
      setMountedView(null);
    };
  }, []);
  useEffect(() => {
    if (props.autoFocus) view.current?.focus();
  }, [props.autoFocus]);

  return (
    <ComposerChrome
      editor={mountedView && { state: editorState, view: mountedView }}
      bare={props.bare}
      onSubmit={props.onSubmit && (() => handleSubmitRef.current())}
      submitting={submitting}
      above={props.above}
      actions={props.actions}
      className={props.className}
      inputClassName={props.inputClassName}
    >
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
        className={`textComposerInput grow whitespace-pre-wrap outline-hidden ${props.bare ? "min-h-12" : ""}`}
      />
      {props.placeholder && editorState.doc.textContent.length === 0 && (
        <div
          className={`absolute top-0 left-0 pointer-events-none italic text-tertiary ${props.bare ? "" : "px-2 py-[6px]"}`}
        >
          {props.placeholder}
        </div>
      )}
      <IOSBS view={view} />
      <MentionAutocomplete
        open={mentionOpen}
        onOpenChange={handleMentionOpenChange}
        view={view}
        onSelect={handleMentionSelect}
        coords={mentionCoords}
      />
    </ComposerChrome>
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
