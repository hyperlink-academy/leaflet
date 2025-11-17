import { useRef, useEffect, useState, useCallback } from "react";
import { elementId } from "src/utils/elementId";
import { useReplicache, useEntity } from "src/replicache";
import { isVisible } from "src/utils/isVisible";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { RenderYJSFragment } from "./RenderYJSFragment";
import { useInitialPageLoad } from "components/InitialPageLoadProvider";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { useUIState } from "src/useUIState";
import { addBlueskyPostBlock, addLinkBlock } from "src/utils/addLinkBlock";
import { BlockCommandBar } from "components/Blocks/BlockCommandBar";
import { useEditorStates } from "src/state/useEditorState";
import { useEntitySetContext } from "components/EntitySetProvider";
import { TooltipButton } from "components/Buttons";
import { blockCommands } from "../BlockCommands";
import { betterIsUrl } from "src/utils/isURL";
import { useSmoker } from "components/Toast";
import { AddTiny } from "components/Icons/AddTiny";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { isIOS } from "src/utils/isDevice";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { DotLoader } from "components/utils/DotLoader";
import { useMountProsemirror } from "./mountProsemirror";
import { schema } from "./schema";
import {
  addMentionToEditor,
  Mention,
  MentionAutocomplete,
} from "app/[leaflet_id]/publish/BskyPostEditorProsemirror";

const HeadingStyle = {
  1: "text-xl font-bold",
  2: "text-lg font-bold",
  3: "text-base font-bold text-secondary ",
} as { [level: number]: string };

export function TextBlock(
  props: BlockProps & {
    className?: string;
    preview?: boolean;
  },
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
          type={props.type}
          entityID={props.entityID}
          className={props.className}
          first={first}
          pageType={props.pageType}
          previousBlock={props.previousBlock}
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
  type: BlockProps["type"];
  previousBlock?: BlockProps["previousBlock"];
}) {
  let initialFact = useEntity(props.entityID, "block/text");
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  let alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value || "left";
  let alignmentClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
    justify: "text-justify",
  }[alignment];
  let { permissions } = useEntitySetContext();

  let content = <br />;
  if (!initialFact) {
    if (permissions.write && (props.first || props.pageType === "canvas"))
      content = (
        <div
          className={`${props.className}
            pointer-events-none italic text-tertiary flex flex-col `}
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
      );
  } else {
    content = <RenderYJSFragment value={initialFact.data.value} wrapper="p" />;
  }
  return (
    <div
      style={{ wordBreak: "break-word" }} // better than tailwind break-all!
      className={`
        ${alignmentClass}
        ${props.type === "blockquote" ? (props.previousBlock?.type === "blockquote" ? `blockquote pt-3 ` : "blockquote") : ""}
        ${props.type === "heading" ? HeadingStyle[headingLevel?.data.value || 1] : ""}
      w-full whitespace-pre-wrap outline-hidden ${props.className} `}
    >
      {content}
    </div>
  );
}

export function BaseTextBlock(props: BlockProps & { className?: string }) {
  let headingLevel = useEntity(props.entityID, "block/heading-level");
  let alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value || "left";

  let rep = useReplicache();

  let selected = useUIState(
    (s) => !!s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let focused = useUIState((s) => s.focusedEntity?.entityID === props.entityID);
  let alignmentClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
    justify: "text-justify",
  }[alignment];

  let editorState = useEditorStates(
    (s) => s.editorStates[props.entityID],
  )?.editor;
  let { viewRef, handleMentionSelect, setMentionState, mentionStateRef } =
    useMentionState(props.entityID);

  let { mountRef, actionTimeout } = useMountProsemirror({
    props,
    mentionStateRef,
  });

  return (
    <>
      <div
        className={`flex items-center justify-between w-full
          ${selected && props.pageType === "canvas" && "bg-bg-page rounded-md"}
          ${
            props.type === "blockquote"
              ? props.previousBlock?.type === "blockquote" && !props.listData
                ? "blockquote pt-3"
                : "blockquote"
              : ""
          }`}
      >
        <pre
          data-entityid={props.entityID}
          onBlur={async () => {
            if (
              ["***", "---", "___"].includes(
                editorState?.doc.textContent.trim() || "",
              )
            ) {
              await rep.rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "block/type",
                data: { type: "block-type-union", value: "horizontal-rule" },
              });
            }
            if (actionTimeout.current) {
              rep.undoManager.endGroup();
              window.clearTimeout(actionTimeout.current);
              actionTimeout.current = null;
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
          outline-hidden

          ${props.type === "heading" ? HeadingStyle[headingLevel?.data.value || 1] : ""}
          ${props.className}`}
          ref={mountRef}
        />
        {editorState && focused && (
          <MentionAutocomplete
            editorState={editorState}
            view={viewRef}
            onSelect={handleMentionSelect}
            onMentionStateChange={(active, range, selectedMention) => {
              setMentionState({ active, range, selectedMention });
            }}
          />
        )}
        {editorState?.doc.textContent.length === 0 &&
        props.previousBlock === null &&
        props.nextBlock === null ? (
          // if this is the only block on the page and is empty or is a canvas, show placeholder
          <div
            className={`${props.className} ${alignmentClass} w-full pointer-events-none absolute top-0 left-0  italic text-tertiary flex flex-col
              ${props.type === "heading" ? HeadingStyle[headingLevel?.data.value || 1] : ""}
              `}
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
        ) : editorState?.doc.textContent.length === 0 && focused ? (
          // if not the only block on page but is the block is empty and selected, but NOT multiselected show add button
          <CommandOptions {...props} className={props.className} />
        ) : null}

        {editorState?.doc.textContent.startsWith("/") && selected && (
          <BlockCommandBar
            props={props}
            searchValue={editorState.doc.textContent.slice(1)}
          />
        )}
      </div>
      <BlockifyLink entityID={props.entityID} editorState={editorState} />
    </>
  );
}

const BlockifyLink = (props: {
  entityID: string;
  editorState: EditorState | undefined;
}) => {
  let [loading, setLoading] = useState(false);
  let { editorState } = props;
  let rep = useReplicache();
  let smoker = useSmoker();
  let isLocked = useEntity(props.entityID, "block/is-locked");
  let focused = useUIState((s) => s.focusedEntity?.entityID === props.entityID);

  let isBlueskyPost =
    editorState?.doc.textContent.includes("bsky.app/") &&
    editorState?.doc.textContent.includes("post");
  // only if the line stats with http or https and doesn't have other content
  // if its bluesky, change text to embed post

  if (
    !isLocked &&
    focused &&
    editorState &&
    betterIsUrl(editorState.doc.textContent) &&
    !editorState.doc.textContent.includes(" ")
  ) {
    return (
      <button
        onClick={async (e) => {
          if (!rep.rep) return;
          rep.undoManager.startGroup();
          if (isBlueskyPost) {
            let success = await addBlueskyPostBlock(
              editorState.doc.textContent,
              props.entityID,
              rep.rep,
            );
            if (!success)
              smoker({
                error: true,
                text: "post not found!",
                position: {
                  x: e.clientX + 12,
                  y: e.clientY,
                },
              });
          } else {
            setLoading(true);
            await addLinkBlock(
              editorState.doc.textContent,
              props.entityID,
              rep.rep,
            );
            setLoading(false);
          }
          rep.undoManager.endGroup();
        }}
        className="absolute right-0 top-0 px-1 py-0.5 text-xs text-tertiary sm:hover:text-accent-contrast border border-border-light sm:hover:border-accent-contrast sm:outline-accent-tertiary rounded-md bg-bg-page selected-outline "
      >
        {loading ? <DotLoader /> : "embed"}
      </button>
    );
  } else return null;
};

const CommandOptions = (props: BlockProps & { className?: string }) => {
  let rep = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();

  return (
    <div
      className={`absolute top-0 right-0 w-fit flex gap-[6px] items-center font-bold  rounded-md  text-sm text-border ${props.pageType === "canvas" && "mr-[6px]"}`}
    >
      <TooltipButton
        className={props.className}
        onMouseDown={async () => {
          let command = blockCommands.find((f) => f.name === "Image");
          if (!rep.rep) return;
          await command?.onSelect(
            rep.rep,
            { ...props, entity_set: entity_set.set },
            rep.undoManager,
          );
        }}
        side="bottom"
        tooltipContent={
          <div className="flex gap-1 font-bold">Add an Image</div>
        }
      >
        <BlockImageSmall className="hover:text-accent-contrast text-border" />
      </TooltipButton>

      {!pub && (
        <TooltipButton
          className={props.className}
          onMouseDown={async () => {
            let command = blockCommands.find((f) => f.name === "New Page");
            if (!rep.rep) return;
            await command?.onSelect(
              rep.rep,
              { ...props, entity_set: entity_set.set },
              rep.undoManager,
            );
          }}
          side="bottom"
          tooltipContent={
            <div className="flex gap-1 font-bold">Add a Subpage</div>
          }
        >
          <BlockDocPageSmall className="hover:text-accent-contrast text-border" />
        </TooltipButton>
      )}

      <TooltipButton
        className={props.className}
        onMouseDown={(e) => {
          e.preventDefault();
          let editor = useEditorStates.getState().editorStates[props.entityID];

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
          focusBlock(
            {
              type: props.type,
              value: props.entityID,
              parent: props.parent,
            },
            { type: "end" },
          );
        }}
        side="bottom"
        tooltipContent={<div className="flex gap-1 font-bold">Add More!</div>}
      >
        <div className="w-6 h-6 flex place-items-center justify-center">
          <AddTiny className="text-accent-contrast" />
        </div>
      </TooltipButton>
    </div>
  );
};

const useMentionState = (entityID: string) => {
  let view = useEditorStates((s) => s.editorStates[entityID])?.view;
  let viewRef = useRef(view || null);
  viewRef.current = view || null;
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    range: { from: number; to: number } | null;
    selectedMention: Mention | null;
  }>({ active: false, range: null, selectedMention: null });
  const mentionStateRef = useRef(mentionState);
  mentionStateRef.current = mentionState;

  const handleMentionSelect = useCallback(
    (mention: Mention, range: { from: number; to: number }) => {
      let view = useEditorStates.getState().editorStates[entityID]?.view;
      if (!view) return;
      addMentionToEditor(mention, range, view);
    },
    [],
  );
  return { mentionStateRef, handleMentionSelect, viewRef, setMentionState };
};
