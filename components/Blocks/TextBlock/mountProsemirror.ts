import { useLayoutEffect, useRef, useEffect, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { ySyncPlugin } from "y-prosemirror";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { Replicache } from "replicache";
import { produce } from "immer";

import { schema } from "./schema";
import { TextBlockKeymap } from "./keymap";
import { inputrules } from "./inputRules";
import { highlightSelectionPlugin } from "./plugins";
import { autolink } from "./autolink-plugin";
import { useEditorStates } from "src/state/useEditorState";
import {
  useEntity,
  useReplicache,
  type ReplicacheMutators,
} from "src/replicache";
import { useHandlePaste } from "./useHandlePaste";
import { BlockProps } from "../Block";
import { useEntitySetContext } from "components/EntitySetProvider";
import { didToBlueskyUrl, atUriToUrl } from "src/utils/mentionUtils";

export function useMountProsemirror({
  props,
  openMentionAutocomplete,
}: {
  props: BlockProps;
  openMentionAutocomplete: () => void;
}) {
  let { entityID, parent } = props;
  let rep = useReplicache();
  let mountRef = useRef<HTMLPreElement | null>(null);
  const repRef = useRef<Replicache<ReplicacheMutators> | null>(null);
  let value = useYJSValue(entityID);
  let entity_set = useEntitySetContext();
  let alignment =
    useEntity(entityID, "block/text-alignment")?.data.value || "left";
  let propsRef = useRef({ ...props, entity_set, alignment });
  let handlePaste = useHandlePaste(entityID, propsRef);

  const actionTimeout = useRef<number | null>(null);

  propsRef.current = { ...props, entity_set, alignment };
  repRef.current = rep.rep;

  useLayoutEffect(() => {
    if (!mountRef.current) return;

    const km = TextBlockKeymap(
      propsRef,
      repRef,
      rep.undoManager,
      openMentionAutocomplete,
    );
    const editor = EditorState.create({
      schema: schema,
      plugins: [
        ySyncPlugin(value),
        keymap(km),
        inputrules(propsRef, repRef, openMentionAutocomplete),
        keymap(baseKeymap),
        highlightSelectionPlugin,
        autolink({
          type: schema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
      ],
    });

    const view = new EditorView(
      { mount: mountRef.current },
      {
        state: editor,
        handlePaste,
        handleClickOn: (_view, _pos, node, _nodePos, _event, direct) => {
          if (!direct) return;

          // Check for didMention inline nodes
          if (node?.type === schema.nodes.didMention) {
            window.open(
              didToBlueskyUrl(node.attrs.did),
              "_blank",
              "noopener,noreferrer",
            );
            return;
          }

          // Check for atMention inline nodes
          if (node?.type === schema.nodes.atMention) {
            const url = atUriToUrl(node.attrs.atURI);
            window.open(url, "_blank", "noopener,noreferrer");
            return;
          }
          if (node.nodeSize - 2 <= _pos) return;

          // Check for marks at the clicked position
          const nodeAt1 = node.nodeAt(_pos - 1);
          const nodeAt2 = node.nodeAt(Math.max(_pos - 2, 0));

          // Check for link marks
          let linkMark =
            nodeAt1?.marks.find((f) => f.type === schema.marks.link) ||
            nodeAt2?.marks.find((f) => f.type === schema.marks.link);
          if (linkMark) {
            window.open(linkMark.attrs.href, "_blank");
            return;
          }
        },
        dispatchTransaction,
      },
    );

    const unsubscribe = useEditorStates.subscribe((s) => {
      let editorState = s.editorStates[entityID];
      if (editorState?.initial) return;
      if (editorState?.editor)
        editorState.view?.updateState(editorState.editor);
    });

    let editorState = useEditorStates.getState().editorStates[entityID];
    if (editorState?.editor && !editorState.initial)
      editorState.view?.updateState(editorState.editor);

    return () => {
      unsubscribe();
      view.destroy();
      useEditorStates.setState((s) => ({
        ...s,
        editorStates: {
          ...s.editorStates,
          [entityID]: undefined,
        },
      }));
    };

    function dispatchTransaction(this: EditorView, tr: any) {
      useEditorStates.setState((s) => {
        let oldEditorState = this.state;
        let newState = this.state.apply(tr);
        let addToHistory = tr.getMeta("addToHistory");
        let isBulkOp = tr.getMeta("bulkOp");
        let docHasChanges = tr.steps.length !== 0 || tr.docChanged;

        // Handle undo/redo history with timeout-based grouping
        if (addToHistory !== false && docHasChanges) {
          if (actionTimeout.current) window.clearTimeout(actionTimeout.current);
          else if (!isBulkOp) rep.undoManager.startGroup();

          if (!isBulkOp) {
            actionTimeout.current = window.setTimeout(() => {
              rep.undoManager.endGroup();
              actionTimeout.current = null;
            }, 200);
          }

          let setState = (s: EditorState) => () =>
            useEditorStates.setState(
              produce((draft) => {
                let view = draft.editorStates[entityID]?.view;
                if (!view?.hasFocus() && !isBulkOp) view?.focus();
                draft.editorStates[entityID]!.editor = s;
              }),
            );

          rep.undoManager.add({
            redo: setState(newState),
            undo: setState(oldEditorState),
          });
        }

        return {
          editorStates: {
            ...s.editorStates,
            [entityID]: {
              editor: newState,
              view: this as unknown as EditorView,
              initial: false,
              keymap: km,
            },
          },
        };
      });
    }
  }, [entityID, parent, value, handlePaste, rep]);
  return { mountRef, actionTimeout };
}

function useYJSValue(entityID: string) {
  const [ydoc] = useState(new Y.Doc());
  const docStateFromReplicache = useEntity(entityID, "block/text");
  let rep = useReplicache();
  const [yText] = useState(ydoc.getXmlFragment("prosemirror"));

  if (docStateFromReplicache) {
    const update = base64.toByteArray(docStateFromReplicache.data.value);
    Y.applyUpdate(ydoc, update);
  }

  useEffect(() => {
    if (!rep.rep) return;
    let timeout = null as null | number;
    const updateReplicache = async () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      await rep.rep?.mutate.assertFact({
        //These undos are handled above in the Prosemirror context
        ignoreUndo: true,
        entity: entityID,
        attribute: "block/text",
        data: {
          value: base64.fromByteArray(update),
          type: "text",
        },
      });
    };
    const f = async (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
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
  }, [yText, entityID, rep, ydoc]);
  return yText;
}
