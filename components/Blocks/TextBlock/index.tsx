import { useRef, useEffect, useState } from "react";
import { elementId } from "src/utils/elementId";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import * as Y from "yjs";
import {
  ProseMirror,
  useEditorEffect,
  useEditorEventCallback,
} from "@nytimes/react-prosemirror";
import * as base64 from "base64-js";
import {
  useReplicache,
  useEntity,
  ReplicacheMutators,
  Fact,
} from "src/replicache";
import { isVisible } from "src/utils/isVisible";

import { EditorState, TextSelection } from "prosemirror-state";
import { ySyncPlugin } from "y-prosemirror";
import { Replicache } from "replicache";
import { generateKeyBetween } from "fractional-indexing";
import { RenderYJSFragment } from "./RenderYJSFragment";
import { useInitialPageLoad } from "components/InitialPageLoadProvider";
import { addImage } from "src/utils/addImage";
import { BlockProps, focusBlock } from "components/Blocks";
import { TextBlockKeymap } from "./keymap";
import { schema } from "./schema";
import { useUIState } from "src/useUIState";
import { MarkType, DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { useAppEventListener } from "src/eventBus";
import { addLinkBlock } from "src/utils/addLinkBlock";
import { BlockOptions } from "components/Blocks/BlockOptions";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { isIOS } from "@react-aria/utils";
import { useIsMobile } from "src/hooks/isMobile";
import { setMark } from "src/utils/prosemirror/setMark";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useHandlePaste } from "./useHandlePaste";
import { highlightSelectionPlugin } from "./plugins";

export function TextBlock(props: BlockProps & { className: string }) {
  let initialized = useInitialPageLoad();
  let first = props.previousBlock === null;
  let permission = useEntitySetContext().permissions.write;
  return (
    <>
      {(!initialized || !permission) && (
        <RenderedTextBlock
          entityID={props.entityID}
          className={props.className}
          type={props.type}
          first={first}
        />
      )}
      {permission && (
        <div
          className={`w-full relative group/text ${!initialized ? "hidden" : ""}`}
        >
          <IOSBS {...props} />
          <BaseTextBlock {...props} />
        </div>
      )}
    </>
  );
}

export function IOSBS(props: BlockProps) {
  let selected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);
  if (selected || initialRender || !isIOS()) return null;
  return (
    <div
      className="h-full w-full absolute cursor-text"
      onMouseDown={(e) => {
        e.preventDefault();
        focusBlock(props, {
          type: "coord",
          top: e.clientY,
          left: e.clientX,
        });
        setTimeout(async () => {
          let target = document.getElementById(
            elementId.block(props.entityID).container,
          );
          let vis = await isVisible(target as Element);
          if (!vis) {
            let parentEl = document.getElementById(
              elementId.card(props.parent).container,
            );
            if (!parentEl) return;
            parentEl?.scrollBy({
              top: 250,
              behavior: "smooth",
            });
          }
        }, 750);
      }}
    />
  );
}

export function RenderedTextBlock(props: {
  entityID: string;
  className?: string;
  placeholder?: string;
  type?: string;
  first?: boolean;
  preview?: boolean;
}) {
  let initialFact = useEntity(props.entityID, "block/text");
  if (!initialFact)
    return (
      <pre
        className={`${props.className} ${
          props.preview
            ? "p-0"
            : `px-3 sm:px-4 italic text-tertiary ${props.type === "heading" ? "pb-0" : "pb-2"} ${props.first ? "pt-2 sm:pt-3" : "pt-1"}`
        }`}
      >
        {/* Render a placeholder if the card is totally empty, else just show the blank line*/}
        {props.first ? "Title" : <br />}
      </pre>
    );
  let doc = new Y.Doc();
  const update = base64.toByteArray(initialFact.data.value);
  Y.applyUpdate(doc, update);
  let nodes = doc.getXmlElement("prosemirror").toArray();

  return (
    <pre
      className={`
      w-full whitespace-pre-wrap outline-none break-words ${props.className} ${
        props.preview
          ? "p-0 min-h-1"
          : `px-3 sm:px-4 ${
              props.type === "heading" ? "pb-0" : "pb-2"
            } ${props.first ? "pt-2 sm:pt-3" : "pt-1"}`
      }`}
    >
      {nodes.length === 0 && <br />}
      {nodes.map((node, index) => (
        <RenderYJSFragment key={index} node={node} />
      ))}
    </pre>
  );
}
export function BaseTextBlock(props: BlockProps & { className: string }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  let repRef = useRef<null | Replicache<ReplicacheMutators>>(null);
  let entity_set = useEntitySetContext();
  let propsRef = useRef({ ...props, entity_set });
  useEffect(() => {
    propsRef.current = { ...props, entity_set };
  }, [props, entity_set]);
  let rep = useReplicache();
  useEffect(() => {
    repRef.current = rep.rep;
  }, [rep?.rep]);

  let selected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let first = props.previousBlock === null;
  let headingLevel = useEntity(props.entityID, "block/heading-level");

  let [value, factID] = useYJSValue(props.entityID);

  let editorState = useEditorStates(
    (s) => s.editorStates[props.entityID],
  )?.editor;
  useEffect(() => {
    if (!editorState)
      setEditorState(props.entityID, {
        editor: EditorState.create({
          schema,
          plugins: [
            ySyncPlugin(value),
            TextBlockKeymap(propsRef, repRef),
            keymap(baseKeymap),
            highlightSelectionPlugin,
          ],
        }),
      });
  }, [editorState, props.entityID, props.parent, value]);
  useEffect(() => {
    return () => {
      useEditorStates.setState((s) => ({
        ...s,
        editorStates: { ...s.editorStates, [props.entityID]: undefined },
      }));
    };
  }, [props.entityID]);
  let handlePaste = useHandlePaste(props.entityID, propsRef, factID);
  if (!editorState) return null;

  return (
    <ProseMirror
      handleClickOn={(view, _pos, node, _nodePos) => {
        if (node.nodeSize - 1 <= _pos) return;
        let mark = node
          .resolve(_pos)
          .marks()
          .find((f) => f.type === schema.marks.link);
        if (mark) {
          window.open(mark.attrs.href, "_blank");
        }
      }}
      handlePaste={handlePaste}
      mount={mount}
      state={editorState}
      dispatchTransaction={(tr) => {
        useEditorStates.setState((s) => {
          let existingState = s.editorStates[props.entityID];
          if (!existingState) return s;
          return {
            editorStates: {
              ...s.editorStates,
              [props.entityID]: {
                ...existingState,
                editor: existingState.editor.apply(tr),
              },
            },
          };
        });
      }}
    >
      <div
        className={`
        flex items-center justify-between w-full
        `}
      >
        <pre
          data-entityid={props.entityID}
          onBlur={async () => {
            if (editorState.doc.textContent.startsWith("http")) {
              await addLinkBlock(
                editorState.doc.textContent,
                props.entityID,
                rep.rep,
              );
            }
          }}
          onFocus={() => {
            setTimeout(() => {
              useUIState.getState().setSelectedBlock(props);
              useUIState.setState(() => ({
                focusedBlock: {
                  type: "block",
                  entityID: props.entityID,
                  parent: props.parent,
                },
              }));
            }, 5);
          }}
          id={elementId.block(props.entityID).text}
          className={`
          textContent
          grow pl-3 pr-3 sm:pl-4 sm:pr-4
          outline-none
          resize-none align-top whitespace-pre-wrap bg-transparent ${first ? "pt-2 sm:pt-3" : "pt-1"} ${props.type === "heading" ? "pb-0" : "pb-2"} ${props.className}`}
          ref={setMount}
        />
        {editorState.doc.textContent.length === 0 &&
          props.position === "a0" &&
          props.nextBlock === null && (
            <div
              className={`${props.className} pointer-events-none absolute top-0 left-0 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 italic text-tertiary `}
            >
              {props.type === "text"
                ? "write something..."
                : headingLevel?.data.value === 3
                  ? "Subheader"
                  : headingLevel?.data.value === 2
                    ? "Header"
                    : "Title"}
            </div>
          )}
        {editorState.doc.textContent.length === 0 && selected && (
          <BlockOptions
            className={`sm:pr-4 pr-3 ${first ? "pt-2 sm:pt-3" : "pt-1"} ${props.type === "heading" ? "pb-0" : "pb-2"}`}
            factID={factID}
            entityID={props.entityID}
            parent={props.parent}
            position={props.position}
            nextPosition={props.nextPosition}
            first={first}
          />
        )}
      </div>
      <SyncView entityID={props.entityID} parentID={props.parent} />
      <CommandHandler entityID={props.entityID} />
    </ProseMirror>
  );
}

const HeadingStyle = {
  1: "text-xl font-bold",
  2: "text-lg font-bold",
  3: "text-base font-bold",
} as { [level: number]: string };

function CommandHandler(props: { entityID: string }) {
  let cb = useEditorEventCallback(
    (view, args: { mark: MarkType; attrs?: any }) => {
      let { to, from, $cursor, $to, $from } = view.state
        .selection as TextSelection;
      let mark = rangeHasMark(view.state, args.mark, from, to);
      if (
        to === from &&
        args.mark?.isInSet(view.state.storedMarks || $cursor?.marks() || [])
      ) {
        return toggleMark(args.mark, args.attrs)(view.state, view.dispatch);
      }
      if (
        mark &&
        (!args.attrs ||
          JSON.stringify(args.attrs) === JSON.stringify(mark.attrs))
      ) {
        toggleMark(args.mark, args.attrs)(view.state, view.dispatch);
      } else setMark(args.mark, args.attrs)(view.state, view.dispatch);
    },
  );
  useAppEventListener(props.entityID, "toggleMark", cb, []);
  return null;
}

let previousFocused: null | string = null;
let SyncView = (props: { entityID: string; parentID: string }) => {
  let isMobile = useIsMobile();
  useEditorEffect((view) => {
    if (isMobile) return;
    if (!view.hasFocus()) return;
    requestAnimationFrame(() => {
      if (!view.hasFocus()) return;
      if (previousFocused === props.entityID) return;
      previousFocused = props.entityID;
      if (
        !view.state.selection.anchor ||
        //@ts-ignore I'm not sure why this type isn't here because it's used in the function underneath
        !view.docView
      )
        return;
      const coords = view.coordsAtPos(view.state.selection.anchor);
      useEditorStates.setState({ lastXPosition: coords.left });

      // scroll card if cursor is at the very top or very bottom of the card
      let parentID = document.getElementById(
        elementId.card(props.parentID).container,
      );
      let parentHeight = parentID?.clientHeight;
      let cursorPosY = coords.top;
      let bottomScrollPadding = 50;
      if (cursorPosY && parentHeight) {
        if (cursorPosY > parentHeight - bottomScrollPadding) {
          parentID?.scrollBy({
            top: bottomScrollPadding - (parentHeight - cursorPosY),
            behavior: "instant",
          });
        }
        if (cursorPosY < 50) {
          if (parentID?.scrollTop === 0) return;
          parentID?.scrollBy({
            top: cursorPosY - 50,
            behavior: "instant",
          });
        }
      }
    });
  });
  useEditorEffect(
    (view) => {
      useEditorStates.setState((s) => {
        let existingEditor = s.editorStates[props.entityID];
        if (!existingEditor) return s;
        return {
          editorStates: {
            ...s.editorStates,
            [props.entityID]: { ...existingEditor, view },
          },
        };
      });
    },
    [props.entityID],
  );
  return null;
};

//I need to get *and* set the value to zustand?
// This will mean that the value is undefined for a second... Maybe I could use a ref to figure that out?
function useYJSValue(entityID: string) {
  const [ydoc] = useState(new Y.Doc());
  const docStateFromReplicache = useEntity(entityID, "block/text");
  let rep = useReplicache();
  const yText = ydoc.getXmlFragment("prosemirror");

  if (docStateFromReplicache) {
    const update = base64.toByteArray(docStateFromReplicache.data.value);
    Y.applyUpdate(ydoc, update);
  }

  useEffect(() => {
    if (!rep.rep) return;
    const f = async () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      await rep.rep?.mutate.assertFact({
        entity: entityID,
        attribute: "block/text",
        data: {
          value: base64.fromByteArray(update),
          type: "text",
        },
      });
    };
    yText.observeDeep(f);
    return () => {
      yText.unobserveDeep(f);
    };
  }, [yText, entityID, rep, ydoc]);
  return [yText, docStateFromReplicache?.id] as const;
}
