import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "./EntitySetProvider";
import { v7 } from "uuid";
import { BaseBlock } from "./Blocks/Block";
import { registerBlockGroup } from "src/utils/blockGroups";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDrag } from "src/hooks/useDrag";
import { isTextBlock } from "src/utils/isTextBlock";
import { focusBlock } from "src/utils/focusBlock";
import { elementId } from "src/utils/elementId";
import { useUIState } from "src/useUIState";
import useMeasure from "react-use-measure";
import { TooltipButton } from "./Buttons";
import { useBlockKeyboardHandlers } from "./Blocks/useBlockKeyboardHandlers";
import { AddSmall } from "./Icons/AddSmall";
import { InfoSmall } from "./Icons/InfoSmall";
import { Popover } from "./Popover";
import { Separator } from "./Layout";
import { CommentTiny } from "./Icons/CommentTiny";
import { AddTags, PublicationMetadata } from "./Pages/PublicationMetadata";
import { useCardBorderHidden } from "./Pages/useCardBorderHidden";
import {
  useLeafletPublicationData,
  useLeafletPublicationPage,
} from "./PageSWRDataProvider";
import {
  useHandleCanvasDrop,
  useHandleCanvasPaste,
} from "./Blocks/useHandleCanvasDrop";
import { useBlockMouseHandlers } from "./Blocks/useBlockMouseHandlers";
import { RecommendEmptyTiny } from "./Icons/RecommendTiny";
import { useSubscribe } from "src/replicache/useSubscribe";
import { mergePreferences } from "src/utils/mergePreferences";
import {
  CANVAS_DRAG_STACK_ORDER,
  canvasBlockOrder,
} from "src/utils/canvasBlockOrder";
import { Replicache } from "replicache";
import { UndoManager } from "src/undoManager";
import { useCanvasPaintOrder } from "src/hooks/queries/useCanvasStacking";
import {
  CustomizeTutorialTooltip,
  useTutorialOpen,
} from "app/(app)/(identity)/lish/[did]/[publication]/edit/CustomizeTutorialTooltip";
import { useCanvasBlocksWithType } from "src/hooks/queries/useBlocks";
import {
  CanvasZoomProvider,
  getCanvasZoom,
  useCanvasZoomEngine,
} from "src/canvasZoom/CanvasZoomProvider";
import { clientToCanvas } from "src/canvasZoom/session";
import { CanvasZoomLayer } from "src/canvasZoom/CanvasZoomLayer";
import { CanvasFocusZoom } from "src/canvasZoom/CanvasFocusZoom";
import { CanvasOverlay } from "src/canvasZoom/CanvasPageScroll";
import { CanvasZoomControls } from "./CanvasZoomControls";
import {
  type CanvasMobileView,
  mobileViewArea,
} from "src/canvasZoom/mobileView";
import {
  CheckboxMenuItem,
  Menu,
  MenuSeparator,
  RadioMenuGroup,
  RadioMenuItem,
} from "./Menu";
import { MobileViewSmall } from "./Icons/MobileViewSmall";
import { EditTiny } from "./Icons/EditTiny";
import { CanvasInkLayer } from "./Blocks/DrawingBlock/CanvasInkLayer";
import { InkToolbar } from "./Blocks/DrawingBlock/InkToolbar";
import { useInkSession } from "./Blocks/DrawingBlock/useInkSession";
import { useCanvasSize } from "src/hooks/queries/useCanvasSize";
import {
  type CanvasBounds,
  clampToCanvas,
  visibleCanvasX,
} from "src/utils/embeddedCanvasSize";

export function Canvas(props: {
  entityID: string;
  first?: boolean;
  /** Below a publication header: the page scrolls it (CanvasPageScroll). */
  pageScroll?: boolean;
}) {
  let { permissions } = useEntitySetContext();
  // Readers on a view-only link get the same lock as published viewers.
  let lockViewerZoom =
    !!useEntity(props.entityID, "canvas/lock-viewer-zoom")?.data.value &&
    !permissions.write;
  let size = useCanvasSize(props.entityID);
  let mobileArea = mobileViewArea(
    useEntity(props.entityID, "canvas/mobile-view")?.data.value,
    size.width,
  );
  // PageWrapper's negative margin starts a borderless card 12px above the
  // page options; a page-scrolled canvas has none to clear.
  let clearPageOptions = useCardBorderHidden() && !props.pageScroll;

  return (
    <CanvasZoomProvider
      pageKey={props.entityID}
      pageScroll={props.pageScroll}
      contentWidth={size.width}
      centered={size.fixed}
      initialArea={mobileArea}
      lockViewerZoom={lockViewerZoom}
      // Writers double tap empty canvas to add a block.
      doubleTapZoom={!permissions.write}
    >
      <CanvasOverlay edge="top">
        {/* A drawing is a picture in its parent page, with no phone framing
            or post metadata of its own. */}
        {!size.fixed && (
          <div
            className={`absolute ${clearPageOptions ? "top-9" : "top-6"} right-3 sm:top-4 sm:right-4 z-20 flex flex-row gap-2 items-start`}
          >
            {permissions.write && (
              <MobileViewToggle entityID={props.entityID} />
            )}
            <CanvasMetadata
              entityID={props.entityID}
              isSubpage={!props.first}
            />
          </div>
        )}
        {permissions.write && <InkToolbar pageID={props.entityID} />}
      </CanvasOverlay>
      {permissions.write && <CanvasFocusZoom pageEntityID={props.entityID} />}

      <CanvasZoomLayer
        id={elementId.page(props.entityID).canvasScrollArea}
        className={size.fixed ? "bg-border-light" : ""}
        contentHeight={size.height}
        mobileArea={mobileArea}
      >
        <CanvasContent {...props} />
      </CanvasZoomLayer>

      <CanvasOverlay edge="bottom">
        <AddCanvasBlockButton entityID={props.entityID} canvas={size} />
        <CanvasZoomControls className="absolute left-2 bottom-2 sm:left-4 sm:bottom-4 z-10 bg-bg-page rounded-md px-1 py-0.5" />
      </CanvasOverlay>
    </CanvasZoomProvider>
  );
}

export function CanvasContent(props: { entityID: string; preview?: boolean }) {
  let blocks = useEntity(props.entityID, "canvas/block");
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let size = useCanvasSize(props.entityID);
  let handleDrop = useHandleCanvasDrop(props.entityID);
  let contentRef = useRef<HTMLDivElement>(null);
  let editable = !props.preview && entity_set.permissions.write;
  useHandleCanvasPaste(props.entityID, contentRef, size, editable);
  let paintOrder = useCanvasPaintOrder(props.entityID);
  let inking = useInkSession((s) => s.page === props.entityID);

  return (
    <div
      ref={contentRef}
      onClick={async (e) => {
        if (e.currentTarget !== e.target) return;
        useUIState.setState(() => ({
          selectedBlocks: [],
          focusedEntity: { entityType: "page", entityID: props.entityID },
        }));
        document
          .getElementById(elementId.page(props.entityID).container)
          ?.scrollIntoView({
            behavior: "smooth",
            inline: "nearest",
          });
        if (!editable) return;
        if ((e.detail === 2 || e.ctrlKey || e.metaKey) && rep) {
          let p = clientToCanvas(e.currentTarget, props.entityID, e);
          let newEntityID = await addCanvasTextBlock(rep, undoManager, {
            parent: props.entityID,
            canvas: size,
            position: { x: Math.max(p.x, 0), y: Math.max(p.y - 12, 0) },
            permission_set: entity_set.set,
          });
          focusBlock(
            { type: "text", parent: props.entityID, entityID: newEntityID },
            { type: "start" },
          );
        }
      }}
      onDragOver={
        editable
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
      onDrop={editable ? handleDrop : undefined}
      style={{
        width: size.width,
        minHeight: size.height,
        // Any other canvas fills the viewport past its last block.
        height: size.fixed ? size.height : "100%",
        contain: "size layout paint",
      }}
      className={`relative ${size.fixed ? `bg-bg-page ${props.preview ? "" : "shadow-sm"}` : ""}`}
    >
      <CanvasBackground
        entityID={props.entityID}
        // A drawing reads as a picture inline; the grid only helps placing
        // blocks while editing it.
        defaultPattern={size.fixed && props.preview ? "plain" : "grid"}
      />
      {editable && <MobileViewGuides entityID={props.entityID} />}
      {editable && inking && <CanvasInkLayer pageID={props.entityID} />}
      {[...blocks]
        .sort((a, b) => canvasBlockOrder(a.data.position, b.data.position))
        .map((b) => (
          <CanvasBlock
            preview={props.preview}
            parent={props.entityID}
            entityID={b.data.value}
            position={{
              ...b.data.position,
              x: visibleCanvasX(b.data.position.x, size.width),
            }}
            factID={b.id}
            stackOrder={paintOrder.indexOf(b.data.value) + 1 || undefined}
            canvas={size}
            key={b.data.value}
          />
        ))}
    </div>
  );
}

const MOBILE_VIEW_LABELS: Record<CanvasMobileView, string> = {
  unconstrained: "Fit whole canvas",
  left: "Anchor to left edge",
  center: "Anchor to center",
};

// Picks how a phone frames this canvas; the anchored views draw their
// area on the canvas as guides.
const MobileViewToggle = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  let fact = useEntity(props.entityID, "canvas/mobile-view");
  let view: CanvasMobileView = fact?.data.value || "unconstrained";
  let lockFact = useEntity(props.entityID, "canvas/lock-viewer-zoom");
  let locked = !!lockFact?.data.value;
  return (
    <div>
      <Menu
        asChild
        side="bottom"
        align="end"
        trigger={
          <button
            aria-label="Mobile view"
            title="Mobile view"
            className={`flex items-center rounded-md p-1 bg-bg-page border border-border-light hover:text-accent-contrast ${view === "unconstrained" ? "text-tertiary" : "text-accent-contrast"}`}
          >
            <MobileViewSmall />
          </button>
        }
      >
        <div className="px-2 pt-1 pb-0.5 text-xs text-tertiary">
          Mobile view
        </div>
        <RadioMenuGroup
          value={view}
          onValueChange={(value) => {
            rep?.mutate.assertFact({
              id: fact?.id,
              entity: props.entityID,
              attribute: "canvas/mobile-view",
              data: {
                type: "canvas-mobile-view-union",
                value: value as CanvasMobileView,
              },
            });
          }}
        >
          {(Object.keys(MOBILE_VIEW_LABELS) as CanvasMobileView[]).map((v) => (
            <RadioMenuItem key={v} value={v} selected={v === view}>
              {MOBILE_VIEW_LABELS[v]}
            </RadioMenuItem>
          ))}
        </RadioMenuGroup>
        <MenuSeparator />
        <CheckboxMenuItem
          compact
          checked={locked}
          onSelect={(e) => {
            e.preventDefault();
            rep?.mutate.assertFact({
              id: lockFact?.id,
              entity: props.entityID,
              attribute: "canvas/lock-viewer-zoom",
              data: { type: "boolean", value: !locked },
            });
          }}
        >
          Lock viewer zoom and scroll
        </CheckboxMenuItem>
      </Menu>
    </div>
  );
};

// Guides for the anchored mobile view area, in canvas px so they scale with
// the zoom; painted under the blocks.
const MobileViewGuides = (props: { entityID: string }) => {
  let area = mobileViewArea(
    useEntity(props.entityID, "canvas/mobile-view")?.data.value,
    useCanvasSize(props.entityID).width,
  );
  if (!area) return null;
  return (
    <div
      aria-hidden
      className="canvasMobileViewGuides absolute top-0 bottom-0 pointer-events-none border-x border-dashed border-accent-1"
      style={{ left: area.left, width: area.width }}
    />
  );
};

const CanvasMetadata = (props: {
  entityID: string;
  isSubpage: boolean | undefined;
}) => {
  let { data: pub, normalizedPublication } = useLeafletPublicationData();
  // A publication's own page has no post metadata.
  let isPublicationPage = !!useLeafletPublicationPage();
  let { rep } = useReplicache();
  // A post header block on the canvas carries the tags and metadata itself.
  let hasHeaderBlock = useCanvasBlocksWithType(props.entityID).some(
    (b) => b.type === "post-header",
  );
  let postPreferences = useSubscribe(rep, (tx) =>
    tx.get<{
      showComments?: boolean;
      showMentions?: boolean;
      showRecommends?: boolean;
    } | null>("post_preferences"),
  );
  if (!pub?.publications || !normalizedPublication) return null;
  if (hasHeaderBlock || isPublicationPage) return null;
  let merged = mergePreferences(
    postPreferences || undefined,
    normalizedPublication.preferences,
  );
  let showComments = merged.showComments !== false;
  let showMentions = merged.showMentions !== false;
  let showRecommends = merged.showRecommends !== false;

  return (
    <div className="flex flex-row gap-3 items-center bg-bg-page border-border-light rounded-md px-2 py-1 h-fit">
      {showRecommends && (
        <div className="flex gap-1 text-tertiary items-center">
          <RecommendEmptyTiny className="text-border" /> —
        </div>
      )}
      {(showComments || showMentions) && (
        <div className="flex gap-1 text-tertiary items-center">
          <CommentTiny className="text-border" /> —
        </div>
      )}

      {(showMentions || showComments || !showRecommends) && (
        <Separator classname="h-4!" />
      )}
      <AddTags />

      {!props.isSubpage && (
        <>
          <Separator classname="h-5" />
          <Popover
            side="left"
            align="start"
            className="flex flex-col gap-2 p-0! max-w-sm w-[1000px]"
            trigger={<InfoSmall />}
          >
            <PublicationMetadata noInteractions />
          </Popover>
        </>
      )}
    </div>
  );
};

const AddCanvasBlockButton = (props: {
  entityID: string;
  canvas: CanvasBounds;
}) => {
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let engine = useCanvasZoomEngine();
  let blocks = useEntity(props.entityID, "canvas/block");
  let tutorialOpen = useTutorialOpen("canvas-add");

  if (!entity_set.permissions.write) return null;
  return (
    <div className="absolute right-2 sm:bottom-4 sm:right-4 bottom-2 sm:top-auto z-10 flex flex-col gap-1 justify-center">
      <CustomizeTutorialTooltip target="canvas-add" className="flex">
        <TooltipButton
          side="left"
          open={blocks.length === 0 ? true : undefined}
          hideTooltip={tutorialOpen}
          tooltipContent={
            <div className="flex flex-col justify-end text-center px-1 leading-snug ">
              <div>Add a Block!</div>
              <div className="font-normal">or double click anywhere</div>
            </div>
          }
          className="w-fit p-2 rounded-full bg-accent-1 border-2 outline-solid outline-transparent hover:outline-1 hover:outline-accent-1 border-accent-1 text-accent-2"
          onMouseDown={() => {
            let box = engine.boxRef.current;
            if (!box || !rep) return;
            // Just inside the top right corner of what is on screen, below
            // a nav stuck over a page-scrolled canvas.
            let navBottom =
              parseFloat(
                getComputedStyle(box).getPropertyValue("--canvas-nav-bottom"),
              ) || 0;
            let corner = engine.canvasPointAt({
              x: engine.viewportRect().width,
              y: navBottom,
            });
            addCanvasTextBlock(rep, undoManager, {
              parent: props.entityID,
              canvas: props.canvas,
              position: {
                x: corner.x - 468,
                y: Math.max(0, corner.y + 32),
              },
              permission_set: entity_set.set,
            }).then((newEntityID) =>
              setTimeout(() => {
                focusBlock(
                  {
                    type: "text",
                    entityID: newEntityID,
                    parent: props.entityID,
                  },
                  { type: "start" },
                );
              }, 20),
            );
          }}
        >
          <AddSmall />
        </TooltipButton>
      </CustomizeTutorialTooltip>
      <TooltipButton
        side="left"
        tooltipContent={<div className="px-1">Draw</div>}
        className="w-fit p-3 rounded-full bg-bg-page border-2 border-accent-1 outline-solid outline-transparent hover:outline-1 hover:outline-accent-1 text-accent-1"
        onMouseDown={() => useInkSession.getState().start(props.entityID)}
      >
        <EditTiny />
      </TooltipButton>
    </div>
  );
};

function CanvasBlock(props: {
  preview?: boolean;
  entityID: string;
  parent: string;
  position: { x: number; y: number };
  factID: string;
  stackOrder: number | undefined;
  canvas: CanvasBounds;
}) {
  let width =
    useEntity(props.entityID, "canvas/block/width")?.data.value || 360;
  // Published records store whole degrees, so the editor shows and saves
  // exactly what will publish.
  let rotation = Math.round(
    useEntity(props.entityID, "canvas/block/rotation")?.data.value || 0,
  );
  let [ref, rect] = useMeasure();
  let type = useEntity(props.entityID, "block/type");
  let isGroup = type?.data.value === "group";
  let { rep } = useReplicache();
  useLayoutEffect(() => {
    if (isGroup) return registerBlockGroup(props.entityID, props.parent);
  }, [isGroup, props.entityID, props.parent]);

  let { permissions } = useEntitySetContext();
  // Drag deltas arrive in screen px; block positions and widths are canvas px.
  let onDragEnd = (dragPosition: { x: number; y: number }) => {
    let zoom = getCanvasZoom(props.parent);
    rep?.mutate.assertFact({
      id: props.factID,
      entity: props.parent,
      attribute: "canvas/block",
      data: {
        type: "spatial-reference",
        value: props.entityID,
        position: clampToCanvas(
          {
            x: props.position.x + dragPosition.x / zoom,
            y: props.position.y + dragPosition.y / zoom,
          },
          { width, height: rect.height / zoom },
          props.canvas,
        ),
      },
    });
  };
  // Editing inside a group keeps the group's handles up.
  let isFocused = useUIState(
    (s) =>
      s.focusedEntity?.entityID === props.entityID ||
      (isGroup &&
        s.focusedEntity?.entityType === "block" &&
        s.focusedEntity.parent === props.entityID),
  );
  let holdsText = isGroup || (!!type && !!isTextBlock[type.data.value]);
  // Text is selected and edited by pressing on it, so a block of it only
  // moves by its body until it is focused; from then on, by the gripper.
  let editable = !props.preview && permissions.write;
  let bodyDraggable = editable && !!type && !(holdsText && isFocused);
  let {
    dragDelta,
    handlers: dragHandlers,
    bodyHandlers,
  } = useDrag({
    onDragEnd,
    bodyIgnore: !holdsText
      ? `${BODY_CONTROLS}, [contenteditable]`
      : isGroup
        ? `${BODY_CONTROLS}, ${TEXT_CONTROLS}, ${GROUP_CONTROLS}`
        : `${BODY_CONTROLS}, ${TEXT_CONTROLS}`,
    bodyText: holdsText
      ? {
          onClick: ({ target, x, y }) => {
            let entityID = target
              .closest("[data-entityid]")
              ?.getAttribute("data-entityid");
            if (!entityID) return;
            focusBlock(
              {
                type: "text",
                entityID,
                parent: isGroup ? props.entityID : props.parent,
              },
              { type: "coord", left: x, top: y },
            );
          },
        }
      : undefined,
  });

  let widthHandle = useDrag({
    onDragEnd: (dragPosition) =>
      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: "canvas/block/width",
        data: {
          type: "number",
          value: width + dragPosition.x / getCanvasZoom(props.parent),
        },
      }),
  });
  let rotateHandle = useDrag({
    onDragEnd: (dragDelta) =>
      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: "canvas/block/rotation",
        data: {
          type: "number",
          value: Math.round(rotation + rotationDelta(rect, dragDelta)) % 360,
        },
      }),
  });
  let angle = rotateHandle.dragDelta
    ? rotationDelta(rect, rotateHandle.dragDelta)
    : 0;
  let liveZoom = getCanvasZoom(props.parent);
  let x = props.position.x + (dragDelta?.x || 0) / liveZoom;
  let y = props.position.y + (dragDelta?.y || 0) / liveZoom;
  let transform = `translate(${x}px, ${y}px) rotate(${Math.round(rotation + angle)}deg) scale(${!dragDelta ? "1.0" : "1.02"})`;
  let [areYouSure, setAreYouSure] = useState(false);
  let blockProps = useMemo(() => {
    return {
      pageType: "canvas" as const,
      preview: props.preview,
      type: type?.data.value || "text",
      value: props.entityID,
      factID: props.factID,
      position: "",
      nextPosition: "",
      entityID: props.entityID,
      parent: props.parent,
      nextBlock: null,
      previousBlock: null,
    };
  }, [
    props.preview,
    props.entityID,
    props.factID,
    props.parent,
    type?.data.value,
  ]);
  useBlockKeyboardHandlers(blockProps, areYouSure, setAreYouSure);
  let blockMouseHandlers = useBlockMouseHandlers(blockProps);
  // A group's children handle their own clicks; the group itself is only
  // selected by clicking its frame.
  let mouseHandlers = isGroup
    ? {
        ...blockMouseHandlers,
        onMouseDown: (e: React.MouseEvent) => {
          if (e.target === e.currentTarget) blockMouseHandlers.onMouseDown(e);
        },
      }
    : blockMouseHandlers;

  let isList = useEntity(props.entityID, "block/is-list");

  return (
    <div
      ref={ref}
      {...(!props.preview ? mouseHandlers : {})}
      // A shift-click selects the block; the page must not take focus for it.
      onClickCapture={(e) => e.shiftKey && e.preventDefault()}
      id={props.preview ? undefined : elementId.block(props.entityID).container}
      className={`canvasBlockWrapper absolute group/canvas-block rounded-lg flex items-stretch origin-center p-3`}
      style={{
        top: 0,
        left: 0,
        // Only the dragged block lifts: the layering buttons act on the focused one.
        zIndex: dragDelta ? CANVAS_DRAG_STACK_ORDER : props.stackOrder,
        width: width + (widthHandle.dragDelta?.x || 0) / liveZoom,
        transform,
      }}
    >
      {editable && <Gripper isFocused={isFocused} {...dragHandlers} />}

      <div
        {...(bodyDraggable ? bodyHandlers : {})}
        className={` w-full ${bodyDraggable ? "[-webkit-touch-callout:none]" : ""} ${dragDelta || widthHandle.dragDelta || rotateHandle.dragDelta ? "pointer-events-none" : ""} `}
      >
        {type && (
          <BaseBlock
            {...blockProps}
            listData={
              isList?.data.value
                ? { path: [], parent: props.parent, depth: 1 }
                : undefined
            }
            areYouSure={areYouSure}
            setAreYouSure={setAreYouSure}
          />
        )}
      </div>

      {editable && (
        <div
          className={`resizeHandle
          cursor-e-resize shrink-0 z-10
         group-hover/canvas-block:block
          sm:w-[5px] w-3 sm:h-6  h-8
          absolute top-1/2 sm:right-2 right-1 -translate-y-1/2
          rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,inset_0_0_0_1px_white]
          ${isFocused ? "block" : "hidden"}

          `}
          {...widthHandle.handlers}
        />
      )}

      {editable && (
        <div
          className={`rotateHandle
            cursor-grab shrink-0 z-10
            group-hover/canvas-block:block
            sm:w-[8px] sm:h-[8px] w-4 h-4
            absolute sm:bottom-0 sm:right-0 -bottom-1 -right-1
            -translate-y-1/2 -translate-x-1/2
            rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,inset_0_0_0_1px_white]
            ${isFocused ? "block" : "hidden"}
`}
          {...rotateHandle.handlers}
        />
      )}
    </div>
  );
}

const CanvasBackground = (props: {
  entityID: string;
  defaultPattern: "grid" | "plain";
}) => {
  let cardBackgroundImage = useEntity(
    props.entityID,
    "theme/card-background-image",
  );
  let cardBackgroundImageRepeat = useEntity(
    props.entityID,
    "theme/card-background-image-repeat",
  );
  let cardBackgroundImageOpacity =
    useEntity(props.entityID, "theme/card-background-image-opacity")?.data
      .value || 1;

  let canvasPattern =
    useEntity(props.entityID, "canvas/background-pattern")?.data.value ||
    props.defaultPattern;
  return (
    <div
      className="w-full h-full pointer-events-none"
      style={{
        backgroundImage: cardBackgroundImage
          ? `url(${cardBackgroundImage.data.src}), url(${cardBackgroundImage.data.fallback})`
          : undefined,
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
        backgroundSize: cardBackgroundImageRepeat?.data.value || 500,
        opacity: cardBackgroundImage?.data.src ? cardBackgroundImageOpacity : 1,
      }}
    >
      <CanvasBackgroundPattern pattern={canvasPattern} />
    </div>
  );
};

export const CanvasBackgroundPattern = (props: {
  pattern: "grid" | "dot" | "plain";
  scale?: number;
}) => {
  if (props.pattern === "plain") return null;
  let patternID = `canvasPattern-${props.pattern}-${props.scale}`;
  let grid = props.pattern === "grid";
  let size = (grid ? 32 : 24) * (props.scale || 1);
  let offset = props.scale ? 16 * props.scale : 0;
  return (
    <svg
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none ${grid ? "text-border-light" : "text-border"}`}
    >
      <defs>
        <pattern
          id={patternID}
          x="0"
          y="0"
          width={size}
          height={size}
          viewBox={grid ? `${offset} ${offset} ${size} ${size}` : undefined}
          patternUnits="userSpaceOnUse"
        >
          {grid ? (
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M16.5 0H15.5L15.5 2.06061C15.5 2.33675 15.7239 2.56061 16 2.56061C16.2761 2.56061 16.5 2.33675 16.5 2.06061V0ZM0 16.5V15.5L2.06061 15.5C2.33675 15.5 2.56061 15.7239 2.56061 16C2.56061 16.2761 2.33675 16.5 2.06061 16.5L0 16.5ZM16.5 32H15.5V29.9394C15.5 29.6633 15.7239 29.4394 16 29.4394C16.2761 29.4394 16.5 29.6633 16.5 29.9394V32ZM32 15.5V16.5L29.9394 16.5C29.6633 16.5 29.4394 16.2761 29.4394 16C29.4394 15.7239 29.6633 15.5 29.9394 15.5H32ZM5.4394 16C5.4394 15.7239 5.66325 15.5 5.93939 15.5H10.0606C10.3367 15.5 10.5606 15.7239 10.5606 16C10.5606 16.2761 10.3368 16.5 10.0606 16.5H5.9394C5.66325 16.5 5.4394 16.2761 5.4394 16ZM13.4394 16C13.4394 15.7239 13.6633 15.5 13.9394 15.5H15.5V13.9394C15.5 13.6633 15.7239 13.4394 16 13.4394C16.2761 13.4394 16.5 13.6633 16.5 13.9394V15.5H18.0606C18.3367 15.5 18.5606 15.7239 18.5606 16C18.5606 16.2761 18.3367 16.5 18.0606 16.5H16.5V18.0606C16.5 18.3367 16.2761 18.5606 16 18.5606C15.7239 18.5606 15.5 18.3367 15.5 18.0606V16.5H13.9394C13.6633 16.5 13.4394 16.2761 13.4394 16ZM21.4394 16C21.4394 15.7239 21.6633 15.5 21.9394 15.5H26.0606C26.3367 15.5 26.5606 15.7239 26.5606 16C26.5606 16.2761 26.3367 16.5 26.0606 16.5H21.9394C21.6633 16.5 21.4394 16.2761 21.4394 16ZM16 5.4394C16.2761 5.4394 16.5 5.66325 16.5 5.93939V10.0606C16.5 10.3367 16.2761 10.5606 16 10.5606C15.7239 10.5606 15.5 10.3368 15.5 10.0606V5.9394C15.5 5.66325 15.7239 5.4394 16 5.4394ZM16 21.4394C16.2761 21.4394 16.5 21.6633 16.5 21.9394V26.0606C16.5 26.3367 16.2761 26.5606 16 26.5606C15.7239 26.5606 15.5 26.3367 15.5 26.0606V21.9394C15.5 21.6633 15.7239 21.4394 16 21.4394Z"
              fill="currentColor"
            />
          ) : (
            <circle cx={size / 2} cy={size / 2} r="1" fill="currentColor" />
          )}
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        x="0"
        y="0"
        fill={`url(#${patternID})`}
      />
    </svg>
  );
};

// Parts of a block's body that keep presses for themselves. A button that
// is the body, like an image that opens its lightbox, is marked
// data-block-body and moves the block like the rest of it.
const BODY_CONTROLS =
  "button:not([data-block-body]), input, textarea, select, iframe, [data-draggable]";
// Inline nodes that act on a click.
const TEXT_CONTROLS = "a, .mention, .footnote-ref, .comment-anchor";
// A group's other blocks and list markers are picked up to reorder them.
const GROUP_CONTROLS = ".nonTextBlockAndControls, [data-drag-handle]";

const Gripper = (props: {
  onMouseDown: (e: React.MouseEvent) => void;
  isFocused: boolean;
}) => {
  return (
    <div
      onMouseDown={props.onMouseDown}
      // A cancelled pointerdown suppresses the mousedown the wrapper selects
      // the block on, so a mouse starts its drag from mousedown instead.
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") props.onMouseDown(e);
      }}
      className="gripper absolute z-10 left-0 top-3 bottom-3 w-[9px] py-1 cursor-grab touch-none"
    >
      <div className="h-full grid grid-cols-1 grid-rows-1 ">
        {/* the gripper is two svg's stacked on top of each other.
        One for the actual gripper, the other is an outline to endure the gripper stays visible on image backgrounds */}
        <div
          className={`h-full col-start-1 col-end-2 row-start-1 row-end-2 bg-bg-page group-hover/canvas-block:block ${props.isFocused ? "block" : "hidden"}`}
          style={{ maskImage: "var(--gripperSVG2)", maskRepeat: "repeat" }}
        />
        <div
          className={`h-full col-start-1 col-end-2 row-start-1 row-end-2 bg-tertiary group-hover/canvas-block:block ${props.isFocused ? "block" : "hidden"}`}
          style={{ maskImage: "var(--gripperSVG)", maskRepeat: "repeat" }}
        />
      </div>
    </div>
  );
};

// One Cmd-Z for addCanvasBlock's fact per attribute.
async function addCanvasTextBlock(
  rep: Replicache<ReplicacheMutators>,
  undoManager: UndoManager,
  {
    canvas,
    ...args
  }: {
    parent: string;
    canvas: CanvasBounds;
    position: { x: number; y: number };
    permission_set: string;
  },
) {
  let newEntityID = v7();
  await undoManager.withUndoGroup(() =>
    rep.mutate.addCanvasBlock({
      ...args,
      position: clampToCanvas(args.position, NEW_BLOCK_SIZE, canvas),
      newEntityID,
      factID: v7(),
      type: "text",
    }),
  );
  return newEntityID;
}

// A new text block's footprint, for keeping it inside a drawing.
const NEW_BLOCK_SIZE = { width: 360, height: 48 };

// Degrees the rotate handle has swept around the block's center, from its
// resting spot at the block's bottom-right corner.
function rotationDelta(
  rect: { width: number; height: number },
  dragDelta: { x: number; y: number },
) {
  let x = rect.width / 2 + dragDelta.x;
  let y = rect.height / 2 + dragDelta.y;
  if (!x && !y) return 0;
  return (
    (Math.atan2(y, x) - Math.atan2(rect.height, rect.width)) * (180 / Math.PI)
  );
}
