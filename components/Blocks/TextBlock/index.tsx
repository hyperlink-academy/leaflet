import { useRef, useEffect, useState, useCallback } from "react";
import { elementId } from "src/utils/elementId";
import { useReplicache, useEntity } from "src/replicache";
import { isVisible } from "src/utils/isVisible";
import { TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { RenderYJSFragment } from "./RenderYJSFragment";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { addBlockBelow, focusNewTextBlock } from "src/utils/addBlockBelow";
import { useIsBlockSelected, useUIState } from "src/useUIState";
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
import { useStaleClient } from "./schemaVersion";
import { useFootnotePopoverStore } from "components/Footnotes/FootnotePopover";
import { blockTextSize } from "src/utils/blockTextSize";
import { getAspectRatio } from "src/utils/aspectRatio";

import { Mention, MentionAutocomplete } from "components/Mention";
import { addMentionToEditor } from "app/(app)/(identity)/[leaflet_id]/publish/BskyPostEditorProsemirror";

const HeadingStyle = {
  1: "font-bold leading-tight pb-1 [font-family:var(--theme-heading-font)]",
  2: "font-bold leading-tight pb-1 [font-family:var(--theme-heading-font)]",
  3: "font-bold leading-tight pb-1 [font-family:var(--theme-heading-font)]",
  4: "font-bold leading-snug pb-1 text-secondary [font-family:var(--theme-heading-font)]",
} as { [level: number]: string };

const headingFontSize = {
  1: blockTextSize.h1,
  2: blockTextSize.h2,
  3: blockTextSize.h3,
  4: blockTextSize.h4,
} as { [level: number]: string };

export function TextBlock(
  props: BlockProps & {
    className?: string;
    preview?: boolean;
  },
) {
  let initialized = useHasPageLoaded();
  let first = props.previousBlock === null;
  let permission = useEntitySetContext().permissions.write;
  // Stale clients (newer-schema content exists; see ./schemaVersion) keep
  // rendering but must not mount an editor.
  let stale = useStaleClient((s) => s.stale);

  return (
    <>
      {(!initialized || !permission || props.preview || stale) && (
        <RenderedTextBlock
          type={props.type}
          entityID={props.entityID}
          className={props.className}
          first={first}
          pageType={props.pageType}
          previousBlock={props.previousBlock}
          pageID={props.parent}
        />
      )}
      {permission && !props.preview && !stale && (
        <div
          // overflow-x-clip keeps the remote-cursor overlay from making the
          // page scroll sideways on iOS Safari when a cursor sits at the edge.
          // The padding/negative-margin pair (box-content keeps the text's
          // width) pushes the clip edge out so a caret centered on the first
          // or last column isn't cut in half — the caret dot is 7px wide, so
          // it needs 3.5px of room past the text edge
          className={`yjs-cursor-clip w-full box-content px-1.5 -mx-1.5 relative group ${!initialized ? "hidden" : ""}`}
        >
          <IOSBS {...props} />
          <BaseTextBlock {...props} />
        </div>
      )}
    </>
  );
}

function IOSBS(props: BlockProps) {
  let [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);
  if (initialRender || !isIOS()) return null;
  return (
    <div
      // z-[1] keeps this overlay hit-testable above BaseTextBlock's root div,
      // which is position:relative and later in the DOM — without it the tap
      // lands on ProseMirror directly and iOS scroll-jumps on native focus
      className="h-full w-full absolute z-[1] cursor-text group-focus-within:hidden py-[18px]"
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
  pageID?: string;
}) {
  let initialFact = useEntity(props.entityID, "block/text");
  let storedHeadingLevel = useEntity(props.entityID, "block/heading-level");
  let headingLevel =
    props.type === "heading" ? storedHeadingLevel?.data.value || 1 : undefined;
  let textSize = useEntity(props.entityID, "block/text-size");
  let alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value || "left";
  let alignmentClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
    justify: "text-justify",
  }[alignment];
  let textStyle =
    textSize?.data.value === "small"
      ? "textSizeSmall"
      : textSize?.data.value === "large"
        ? "textSizeLarge"
        : "";
  let { permissions } = useEntitySetContext();

  let content = <br />;
  if (!initialFact) {
    if (permissions.write && (props.first || props.pageType === "canvas"))
      content = (
        <div
          className={`${props.className}
            pointer-events-none italic text-tertiary flex flex-col `}
        >
          {headingLevel === 1
            ? "Title"
            : headingLevel === 2
              ? "Header"
              : headingLevel === 3
                ? "Subheader"
                : "write something…"}
          <div className=" text-xs font-normal">
            or type &quot;/&quot; for commands
          </div>
        </div>
      );
  } else {
    content = (
      <RenderYJSFragment
        value={initialFact.data.value}
        wrapper="p"
        renderComments={permissions.write}
      />
    );
  }
  return (
    <div
      style={{
        wordBreak: "break-word",
        ...(headingLevel ? { fontSize: headingFontSize[headingLevel] } : {}),
      }}
      onClick={(e) => {
        let target = e.target as HTMLElement;
        let footnoteRef = target.closest(".footnote-ref") as HTMLElement | null;
        if (!footnoteRef) return;
        let footnoteID = footnoteRef.dataset.footnoteId;
        if (!footnoteID) return;
        let store = useFootnotePopoverStore.getState();
        if (store.activeFootnoteID === footnoteID) {
          store.close();
        } else {
          store.open(footnoteID, footnoteRef, props.pageID);
        }
      }}
      className={`
        ${alignmentClass}
        ${props.type === "blockquote" && !headingLevel ? (props.previousBlock?.type === "blockquote" ? `blockquote pt-3 ` : "blockquote") : ""}
        ${headingLevel ? HeadingStyle[headingLevel] : textStyle}
      w-full whitespace-pre-wrap outline-hidden ${props.className} `}
    >
      {content}
    </div>
  );
}

function BaseTextBlock(props: BlockProps & { className?: string }) {
  let storedHeadingLevel = useEntity(props.entityID, "block/heading-level");
  let headingLevel =
    props.type === "heading" ? storedHeadingLevel?.data.value || 1 : undefined;
  let textSize = useEntity(props.entityID, "block/text-size");
  let alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value || "left";

  let selected = useIsBlockSelected(props.entityID);
  let focused = useUIState((s) => s.focusedEntity?.entityID === props.entityID);
  let alignmentClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
    justify: "text-justify",
  }[alignment];
  let textStyle =
    textSize?.data.value === "small"
      ? "textSizeSmall text-secondary"
      : textSize?.data.value === "large"
        ? "textSizeLarge text-primary"
        : "text-primary";

  const {
    viewRef,
    mentionOpen,
    mentionCoords,
    openMentionAutocomplete,
    handleMentionSelect,
    handleMentionEmbed,
    handleMentionOpenChange,
  } = useMentionState(props.entityID, props);

  let { mountRef, overlay } = useMountProsemirror({
    props,
    openMentionAutocomplete,
  });

  return (
    <>
      <div
        className={`relative flex items-center justify-between
          ${selected && props.pageType === "canvas" && "bg-bg-page rounded-md"}
          ${
            props.type === "blockquote" && !headingLevel
              ? props.previousBlock?.type === "blockquote" && !props.listData
                ? "blockquote w-auto pt-3"
                : "blockquote w-auto"
              : "w-full"
          }`}
      >
        {overlay}
        <pre
          data-entityid={props.entityID}
          onFocus={() => {
            handleMentionOpenChange(false);
            setTimeout(() => {
              useUIState.getState().focusAndSelectBlock({
                entityID: props.entityID,
                parent: props.parent,
              });
            }, 5);
          }}
          id={elementId.block(props.entityID).text}
          // unless we break *only* on urls, this is better than tailwind 'break-all'
          // b/c break-all can cause breaks in the middle of words, but break-word still
          // forces break if a single text string (e.g. a url) spans more than a full line
          style={{
            wordBreak: "break-word",
            fontFamily: headingLevel
              ? "var(--theme-heading-font)"
              : "var(--theme-font)",
            ...(headingLevel
              ? { fontSize: headingFontSize[headingLevel] }
              : {}),
          }}
          className={`
            ${alignmentClass}
          grow resize-none align-top whitespace-pre-wrap bg-transparent
          outline-hidden
          ${focused ? "block-focused" : ""}

          ${headingLevel ? HeadingStyle[headingLevel] : textStyle}
          ${props.className}`}
          ref={mountRef}
        />
        {focused && (
          <MentionAutocomplete
            open={mentionOpen}
            onOpenChange={handleMentionOpenChange}
            view={viewRef}
            onSelect={handleMentionSelect}
            onEmbed={handleMentionEmbed}
            coords={mentionCoords}
          />
        )}
        {/* The overlays subscribe to the block's editor text; only mount them
            when one of them could show, so unfocused blocks carry no
            per-keystroke store subscription at all. */}
        {((props.previousBlock === null && props.nextBlock === null) ||
          focused ||
          selected) && (
          <TextBlockOverlays
            {...props}
            focused={focused}
            selected={selected}
            headingLevel={headingLevel}
            alignmentClass={alignmentClass}
            textStyle={textStyle}
          />
        )}
      </div>
      {focused && <BlockifyLink entityID={props.entityID} />}
    </>
  );
}

const TextBlockOverlays = (
  props: BlockProps & {
    className?: string;
    focused: boolean;
    selected: boolean;
    headingLevel: number | undefined;
    alignmentClass: string;
    textStyle: string;
  },
) => {
  let textContent = useEditorStates(
    (s) => s.editorStates[props.entityID]?.editor.doc.textContent,
  );
  if (textContent === undefined) return null;
  return (
    <>
      {textContent.length === 0 &&
      props.previousBlock === null &&
      props.nextBlock === null ? (
        // if this is the only block on the page and is empty or is a canvas, show placeholder
        <div
          style={
            props.headingLevel
              ? { fontSize: headingFontSize[props.headingLevel] }
              : undefined
          }
          className={`${props.className} ${props.alignmentClass} w-full pointer-events-none absolute top-0 left-0  italic text-tertiary flex flex-col
              ${props.headingLevel ? HeadingStyle[props.headingLevel] : props.textStyle}
              `}
        >
          {props.headingLevel === 3
            ? "Subheader"
            : props.headingLevel === 2
              ? "Header"
              : props.headingLevel === 1
                ? "Title"
                : "write something…"}
          <div className=" text-xs font-normal">
            or type &quot;/&quot; to add a block
          </div>
        </div>
      ) : textContent.length === 0 && props.focused ? (
        // if not the only block on page but is the block is empty and selected, but NOT multiselected show add button
        <CommandOptions {...props} className={props.className} />
      ) : null}

      {textContent.startsWith("/") && props.selected && (
        <BlockCommandBar props={props} searchValue={textContent.slice(1)} />
      )}
    </>
  );
};

const blueskyclients = [
  "blacksky.community/",
  "bsky.app/",
  "witchsky.app/",
  "anisota.net/",
  "mu.social/",
  "bluepy.social/",
  "reddwarf.app/",
  "catsky.social/",
  "deer.social/",
];

const BlockifyLink = (props: { entityID: string }) => {
  let [loading, setLoading] = useState(false);
  let rep = useReplicache();
  let smoker = useSmoker();
  let textContent = useEditorStates(
    (s) => s.editorStates[props.entityID]?.editor.doc.textContent,
  );

  let isBlueskyPost =
    textContent !== undefined &&
    blueskyclients.some((client) => textContent.includes(client)) &&
    textContent.includes("post");
  // only if the line starts with http or https and doesn't have other content
  // if its bluesky, change text to embed post

  if (
    textContent !== undefined &&
    betterIsUrl(textContent) &&
    !textContent.includes(" ")
  ) {
    let content = textContent;
    return (
      <button
        onClick={async (e) => {
          if (!rep.rep) return;
          await rep.undoManager.withUndoGroup(async () => {
            if (isBlueskyPost) {
              let success = await addBlueskyPostBlock(
                content,
                props.entityID,
                rep.rep!,
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
              await addLinkBlock(content, props.entityID, rep.rep!);
              setLoading(false);
            }
          });
        }}
        className="absolute right-0 top-0 px-1 py-0.5 text-xs text-tertiary sm:hover:text-accent-contrast border border-border-light sm:hover:border-accent-contrast rounded-md bg-bg-page h-6 flex items-center"
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
          if (editorState && editor?.view) {
            editor.view.focus();
            let tr = editorState.tr.insertText("/", 1);
            tr.setSelection(TextSelection.create(tr.doc, 2));
            editor.view.dispatch(tr);
          }
          focusBlock(
            {
              type: props.type,
              entityID: props.entityID,
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

const useMentionState = (entityID: string, blockProps: BlockProps) => {
  // Select the view directly: it's stable for the lifetime of the mount, so
  // this never re-renders on typing (the full entry object is rebuilt on
  // every transaction).
  let view = useEditorStates((s) => s.editorStates[entityID]?.view);
  let viewRef = useRef(view || null);
  viewRef.current = view || null;

  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let blockPropsRef = useRef(blockProps);
  blockPropsRef.current = blockProps;

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionCoords, setMentionCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mentionInsertPos, setMentionInsertPos] = useState<number | null>(null);

  // Close autocomplete when this block is no longer focused
  const isFocused = useUIState((s) => s.focusedEntity?.entityID === entityID);
  useEffect(() => {
    if (!isFocused) {
      setMentionOpen(false);
      setMentionCoords(null);
      setMentionInsertPos(null);
    }
  }, [isFocused]);

  const openMentionAutocomplete = useCallback(() => {
    const view = useEditorStates.getState().editorStates[entityID]?.view;
    if (!view) return;

    // Get the position right after the @ we just inserted
    const pos = view.state.selection.from;
    setMentionInsertPos(pos);

    // Get coordinates for the popup relative to the positioned parent
    const coords = view.coordsAtPos(pos - 1); // Position of the @

    // Find the relative positioned parent container
    const editorEl = view.dom;
    const container = editorEl.closest(".relative") as HTMLElement | null;

    if (container) {
      const containerRect = container.getBoundingClientRect();
      setMentionCoords({
        top: coords.bottom - containerRect.top,
        left: coords.left - containerRect.left,
      });
    } else {
      setMentionCoords({
        top: coords.bottom,
        left: coords.left,
      });
    }
    setMentionOpen(true);
  }, [entityID]);

  const handleMentionSelect = useCallback(
    (mention: Mention) => {
      const view = useEditorStates.getState().editorStates[entityID]?.view;
      if (!view || mentionInsertPos === null) return;

      // The @ is at mentionInsertPos - 1, we need to replace it with the mention
      const from = mentionInsertPos - 1;
      const to = mentionInsertPos;

      addMentionToEditor(mention, { from, to }, view);
      view.focus();
    },
    [entityID, mentionInsertPos],
  );

  const handleMentionEmbed = useCallback(
    async (mention: Mention & { type: "service_result" }) => {
      if (!rep || !mention.embed) return;
      let embed = mention.embed;
      let props = blockPropsRef.current;

      const editorState =
        useEditorStates.getState().editorStates[entityID]?.editor;
      // Check if the block is empty (only the @ character)
      const blockIsEmpty =
        editorState &&
        editorState.doc.textContent.replace("@", "").trim() === "";

      await undoManager.withUndoGroup(async () => {
        let targetEntityID: string;
        if (blockIsEmpty) {
          // Replace the current block
          targetEntityID = props.entityID;
          await rep.mutate.assertFact({
            entity: targetEntityID,
            attribute: "block/type",
            data: { type: "block-type-union", value: "embed" },
          });
          await rep.mutate.retractAttribute({
            entity: targetEntityID,
            attribute: "block/text",
          });
        } else {
          // Create a new block below
          targetEntityID = await addBlockBelow(rep, {
            parent: props.parent,
            position: props.position,
            nextPosition: props.nextPosition,
            permission_set: entity_set.set,
            type: "embed",
          });
          // Remove the @ from the current block's editor
          const view = useEditorStates.getState().editorStates[entityID]?.view;
          if (view && mentionInsertPos !== null) {
            const from = mentionInsertPos - 1;
            const to = mentionInsertPos;
            const tr = view.state.tr.delete(from, to);
            tr.setMeta("bulkOp", true);
            view.dispatch(tr);
          }
        }

        // Set embed attributes
        let facts: Parameters<typeof rep.mutate.assertFact>[0] = [
          {
            entity: targetEntityID,
            attribute: "embed/url",
            data: { type: "string", value: embed.src },
          },
        ];
        let aspectRatio = getAspectRatio(
          embed.aspectRatio
            ? embed.aspectRatio
            : embed.width && embed.height
              ? { width: embed.width, height: embed.height }
              : undefined,
        );
        if (aspectRatio) {
          facts.push({
            entity: targetEntityID,
            attribute: "embed/aspect-ratio",
            data: { type: "string", value: aspectRatio },
          });
        } else {
          facts.push({
            entity: targetEntityID,
            attribute: "embed/height",
            data: {
              type: "number",
              value: embed.height || 360,
            },
          });
        }
        await rep.mutate.assertFact(facts);
      });
    },
    [rep, entityID, entity_set.set, mentionInsertPos, undoManager],
  );

  const handleMentionOpenChange = useCallback((open: boolean) => {
    setMentionOpen(open);
    if (!open) {
      setMentionCoords(null);
      setMentionInsertPos(null);
    }
  }, []);

  return {
    viewRef,
    mentionOpen,
    mentionCoords,
    openMentionAutocomplete,
    handleMentionSelect,
    handleMentionEmbed,
    handleMentionOpenChange,
  };
};
