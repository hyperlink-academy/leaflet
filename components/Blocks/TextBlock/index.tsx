import { useRef, useEffect, useState, useCallback } from "react";
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

import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { ySyncPlugin } from "y-prosemirror";
import { Replicache } from "replicache";
import { generateKeyBetween } from "fractional-indexing";
import { RenderYJSFragment } from "./RenderYJSFragment";
import { useInitialPageLoad } from "components/InitialPageLoadProvider";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { TextBlockKeymap } from "./keymap";
import { schema } from "./schema";
import { useUIState } from "src/useUIState";
import { MarkType, DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { useAppEventListener } from "src/eventBus";
import { addLinkBlock } from "src/utils/addLinkBlock";
import { BlockCommandBar } from "components/Blocks/BlockCommandBar";
import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { isIOS } from "@react-aria/utils";
import { useIsMobile } from "src/hooks/isMobile";
import { setMark } from "src/utils/prosemirror/setMark";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useHandlePaste } from "./useHandlePaste";
import { highlightSelectionPlugin } from "./plugins";
import { inputrules } from "./inputRules";
import {
  AddSmall,
  AddTiny,
  BlockDocPageSmall,
  BlockImageSmall,
  MoreOptionsTiny,
} from "components/Icons";
import { ToolbarButton } from "components/Toolbar";
import { TooltipButton } from "components/Buttons";
import { v7 } from "uuid";
import { focusPage } from "components/Pages";

export function TextBlock(
  props: BlockProps & { className?: string; preview?: boolean },
) {
  let isLocked = useEntity(props.entityID, "block/is-locked");
  let initialized = useInitialPageLoad();
  let first = props.previousBlock === null;
  let permission = useEntitySetContext().permissions.write;

  return (
    <>
      {(!initialized ||
        !permission ||
        props.preview ||
        isLocked?.data.value) && (
        <RenderedTextBlock
          entityID={props.entityID}
          className={props.className}
          first={first}
          pageType={props.pageType}
        />
      )}
      {permission && !props.preview && !isLocked?.data.value && (
        <div
          className={`w-full relative group ${!initialized ? "hidden" : ""}`}
        >
          <IOSBS {...props} />
          <BaseTextBlock {...props} />
        </div>
      )}
    </>
  );
}

export function IOSBS(props: BlockProps) {
  let [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);
  if (initialRender || !isIOS()) return null;
  return (
    <div
      className="h-full w-full absolute cursor-text group-focus-within:hidden py-[18px]"
      onPointerUp={(e) => {
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
              elementId.page(props.parent).container,
            );
            if (!parentEl) return;
            parentEl?.scrollBy({
              top: 250,
              behavior: "smooth",
            });
          }
        }, 100);
      }}
    />
  );
}

export function RenderedTextBlock(props: {
  entityID: string;
  className?: string;
  first?: boolean;
  pageType?: "canvas" | "doc";
}) {
  let initialFact = useEntity(props.entityID, "block/text");
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  let alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value || "left";
  let alignmentClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  }[alignment];
  let { permissions } = useEntitySetContext();

  if (!initialFact) {
    if (!permissions.write) return <br />;
    return (
      <pre className={`${props.className} italic text-tertiary`}>
        {/* Render a placeholder if this is a doc and there are no other blocks in the page, or this is a canvas. else just show the blank line*/}
        {(props.pageType === "doc" && props.first) ||
        props.pageType === "canvas" ? (
          <div
            className={`${props.className} pointer-events-none italic text-tertiary flex flex-col `}
          >
            {headingLevel?.data.value === 1
              ? "Title"
              : headingLevel?.data.value === 2
                ? "Header"
                : headingLevel?.data.value === 3
                  ? "Subheader"
                  : "write something..."}
            <div className=" text-xs font-normal">
              or type &quot;/&quot; for commands
            </div>
          </div>
        ) : (
          <br />
        )}
      </pre>
    );
  }
  // show a blank line if the block is empty. blocks with content are styled elsewhere! update both!
  let doc = new Y.Doc();
  const update = base64.toByteArray(initialFact.data.value);
  Y.applyUpdate(doc, update);
  let nodes = doc.getXmlElement("prosemirror").toArray();

  // show the rendered version of the block if the block has something in it!
  // empty block rendering is handled further up. update both!
  return (
    <pre
      style={{ wordBreak: "break-word" }} // better than tailwind break-all!
      className={`
        ${alignmentClass}
      w-full whitespace-pre-wrap outline-none ${props.className} `}
    >
      {nodes.length === 0 && <br />}
      {nodes.map((node, index) => (
        <RenderYJSFragment key={index} node={node} />
      ))}
    </pre>
  );
}

export function BaseTextBlock(props: BlockProps & { className?: string }) {
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

  let focused = useUIState((s) => s.focusedEntity?.entityID === props.entityID);
  let selected = useUIState(
    (s) => !!s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  let alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value || "left";
  let alignmentClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  }[alignment];

  let [value, factID] = useYJSValue(props.entityID);

  let editorState = useEditorStates(
    (s) => s.editorStates[props.entityID],
  )?.editor;
  useEffect(() => {
    if (!editorState) {
      let km = TextBlockKeymap(propsRef, repRef);
      setEditorState(props.entityID, {
        keymap: km,
        editor: EditorState.create({
          schema,
          plugins: [
            ySyncPlugin(value),
            keymap(km),
            inputrules(propsRef, repRef),
            keymap(baseKeymap),
            highlightSelectionPlugin,
          ],
        }),
      });
    }
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
  let handleClickOn = useCallback<
    Exclude<Parameters<typeof ProseMirror>[0]["handleClickOn"], undefined>
  >((view, _pos, node, _nodePos, _event, direct) => {
    if (!direct) return;
    if (node.nodeSize - 2 <= _pos) return;
    let mark =
      node.nodeAt(_pos - 1)?.marks.find((f) => f.type === schema.marks.link) ||
      node.nodeAt(_pos - 2)?.marks.find((f) => f.type === schema.marks.link);
    if (mark) {
      window.open(mark.attrs.href, "_blank");
    }
  }, []);
  let dispatchTransaction = useCallback(
    (tr: Transaction) => {
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
    },
    [props.entityID],
  );
  if (!editorState) return null;

  return (
    <ProseMirror
      handleClickOn={handleClickOn}
      handlePaste={handlePaste}
      mount={mount}
      state={editorState}
      dispatchTransaction={dispatchTransaction}
    >
      <div
        className={`flex items-center justify-between w-full ${selected && props.pageType === "canvas" && "bg-bg-page rounded-md"} `}
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
                focusedEntity: {
                  entityType: "block",
                  entityID: props.entityID,
                  parent: props.parent,
                },
              }));
            }, 5);
          }}
          id={elementId.block(props.entityID).text}
          // unless we break *only* on urls, this is better than tailwind 'break-all'
          // b/c break-all can cause breaks in the middle of words, but break-word still
          // forces break if a single text string (e.g. a url) spans more than a full line
          style={{ wordBreak: "break-word" }}
          className={`
            ${alignmentClass}
          grow resize-none align-top whitespace-pre-wrap bg-transparent
          outline-none
          ${props.className}`}
          ref={setMount}
        />
        {editorState.doc.textContent.length === 0 &&
        props.previousBlock === null &&
        props.nextBlock === null ? (
          // if this is the only block on the page and is empty or is a canvas, show placeholder
          <div
            className={`${props.className} pointer-events-none absolute top-0 left-0  italic text-tertiary flex flex-col`}
          >
            {props.type === "text"
              ? "write something..."
              : headingLevel?.data.value === 3
                ? "Subheader"
                : headingLevel?.data.value === 2
                  ? "Header"
                  : "Title"}
            <div className=" text-xs font-normal">
              or type &quot;/&quot; to add a block
            </div>
          </div>
        ) : editorState.doc.textContent.length === 0 && focused ? (
          // if not the only block on page but is the block is empty and selected, but NOT multiselected show add button
          <div
            className={`absolute top-0 right-0 w-fit flex gap-[6px] items-center font-bold  rounded-md  text-sm text-border ${props.pageType === "canvas" && "mr-[6px]"}`}
          >
            <TooltipButton
              className={props.className}
              onMouseDown={async () => {
                let entity;
                if (!props.entityID) {
                  entity = v7();
                  await rep.rep?.mutate.addBlock({
                    parent: props.parent,
                    factID: v7(),
                    permission_set: entity_set.set,
                    type: "image",
                    position: generateKeyBetween(
                      props.position,
                      props.nextPosition,
                    ),
                    newEntityID: entity,
                  });
                } else {
                  entity = props.entityID;
                  await rep.rep?.mutate.assertFact({
                    entity,
                    attribute: "block/type",
                    data: { type: "block-type-union", value: "image" },
                  });
                }
                return entity;
              }}
              side="bottom"
              tooltipContent={
                <div className="flex gap-1 font-bold">Add an Image</div>
              }
            >
              <BlockImageSmall className="hover:text-accent-contrast text-border" />
            </TooltipButton>

            <TooltipButton
              className={props.className}
              onMouseDown={async () => {
                let entity;
                if (!props.entityID) {
                  entity = v7();
                  await rep.rep?.mutate.addBlock({
                    parent: props.parent,
                    factID: v7(),
                    permission_set: entity_set.set,
                    type: "card",
                    position: generateKeyBetween(
                      props.position,
                      props.nextPosition,
                    ),
                    newEntityID: entity,
                  });
                } else {
                  entity = props.entityID;
                  await rep.rep?.mutate.assertFact({
                    entity,
                    attribute: "block/type",
                    data: { type: "block-type-union", value: "card" },
                  });
                }

                let newPage = v7();
                await rep.rep?.mutate.addPageLinkBlock({
                  blockEntity: entity,
                  firstBlockFactID: v7(),
                  firstBlockEntity: v7(),
                  pageEntity: newPage,
                  type: "doc",
                  permission_set: entity_set.set,
                });
                useUIState.getState().openPage(props.parent, newPage);
                rep.rep && focusPage(newPage, rep.rep, "focusFirstBlock");
              }}
              side="bottom"
              tooltipContent={
                <div className="flex gap-1 font-bold">Add a Subpage</div>
              }
            >
              <BlockDocPageSmall className="hover:text-accent-contrast text-border" />
            </TooltipButton>

            <TooltipButton
              className={props.className}
              onMouseDown={(e) => {
                e.preventDefault();
                let editor =
                  useEditorStates.getState().editorStates[props.entityID];

                let editorState = editor?.editor;
                if (editorState) {
                  editor?.view?.focus();
                  let tr = editorState.tr.insertText("/", 1);
                  tr.setSelection(TextSelection.create(tr.doc, 2));
                  useEditorStates.setState((s) => ({
                    editorStates: {
                      ...s.editorStates,
                      [props.entityID]: {
                        ...s.editorStates[props.entityID]!,
                        editor: editorState!.apply(tr),
                      },
                    },
                  }));
                }
              }}
              side="bottom"
              tooltipContent={
                <div className="flex gap-1 font-bold">Add More!</div>
              }
            >
              <div className="w-6 h-6 flex place-items-center justify-center">
                <AddTiny className="text-accent-contrast" />
              </div>
            </TooltipButton>
          </div>
        ) : null}
        {editorState.doc.textContent.startsWith("/") && selected && (
          <BlockCommandBar
            props={props}
            searchValue={editorState.doc.textContent.slice(1)}
          />
        )}
        {editorState.doc.textContent.startsWith("/") && selected && (
          <BlockCommandBar
            props={props}
            searchValue={editorState.doc.textContent.slice(1)}
          />
        )}
      </div>
      <SyncView entityID={props.entityID} parentID={props.parent} />
      <CommandHandler entityID={props.entityID} />
    </ProseMirror>
  );
}

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
    setTimeout(() => {
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

      // scroll page if cursor is at the very top or very bottom of the page
      let parentID = document.getElementById(
        elementId.page(props.parentID).container,
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
    }, 800);
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
    let timeout = null as null | number;
    const f = async () => {
      const updateReplicache = async () => {
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
      if (timeout) clearTimeout(timeout);
      updateReplicache();
      timeout = window.setTimeout(async () => {
        updateReplicache();
      }, 20);
    };

    yText.observeDeep(f);
    return () => {
      yText.unobserveDeep(f);
    };
  }, [yText, entityID, rep, ydoc]);
  return [yText, docStateFromReplicache?.id] as const;
}
