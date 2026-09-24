import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "./EntitySetProvider";
import { v7 } from "uuid";
import { BaseBlock } from "./Blocks/Block";
import { registerBlockGroup } from "src/utils/blockGroups";
import {
  type CSSProperties,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDrag } from "src/hooks/useDrag";
import { useLongPress } from "src/hooks/useLongPress";
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
import { useLeafletPublicationData } from "./PageSWRDataProvider";
import { useHandleCanvasDrop } from "./Blocks/useHandleCanvasDrop";
import { useBlockMouseHandlers } from "./Blocks/useBlockMouseHandlers";
import { RecommendEmptyTiny } from "./Icons/RecommendTiny";
import { useSubscribe } from "src/replicache/useSubscribe";
import { mergePreferences } from "src/utils/mergePreferences";
import {
  CANVAS_DRAG_STACK_ORDER,
  canvasBlockOrder,
  canvasContentHeight,
} from "src/utils/canvasBlockOrder";
import { Replicache } from "replicache";
import { UndoManager } from "src/undoManager";
import { useCanvasStackOrders } from "src/hooks/queries/useCanvasStacking";
import { useCanvasBlocksWithType } from "src/hooks/queries/useBlocks";
import {
  CanvasZoomProvider,
  getCanvasZoom,
} from "src/canvasZoom/CanvasZoomProvider";
import { CanvasZoomLayer } from "src/canvasZoom/CanvasZoomLayer";
import { CanvasFocusZoom } from "src/canvasZoom/CanvasFocusZoom";
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
import { useCanvasFixedSize } from "src/hooks/queries/useCanvasFixedSize";
import {
  type CanvasSize,
  clampToCanvasSize,
} from "src/utils/embeddedCanvasSize";

export function Canvas(props: {
  entityID: string;
  preview?: boolean;
  first?: boolean;
}) {
  let entity_set = useEntitySetContext();
  let ref = useRef<HTMLDivElement>(null);
  let blocks = useEntity(props.entityID, "canvas/block");
  // Readers on a view-only link get the same lock as published viewers.
  let lockViewerZoom =
    !!useEntity(props.entityID, "canvas/lock-viewer-zoom")?.data.value &&
    !entity_set.permissions.write;
  let fixedSize = useCanvasFixedSize(props.entityID);
  let contentHeight = fixedSize
    ? fixedSize.height
    : canvasContentHeight(blocks.map((b) => b.data.position));
  let mobileViewValue = useEntity(props.entityID, "canvas/mobile-view")?.data
    .value;
  let mobileArea = fixedSize ? null : mobileViewArea(mobileViewValue);

  return (
    <div
      ref={ref}
      id={elementId.page(props.entityID).canvasScrollArea}
      // A class rather than an inline width: the zoom engine owns the
      // scroller's inline width, which it rewrites to fit a scrollbar gutter.
      style={
        fixedSize
          ? ({
              "--canvas-fixed-width": `${fixedSize.width}px`,
            } as CSSProperties)
          : undefined
      }
      className={`
        canvasWrapper
        h-full max-w-full
        ${fixedSize ? "w-(--canvas-fixed-width) bg-border-light" : "w-[1272px]"}
        overflow-y-scroll touch-pan-x touch-pan-y
      `}
    >
      <CanvasZoomProvider
        pageKey={props.entityID}
        scrollerRef={ref}
        contentWidth={fixedSize?.width}
        centered={!!fixedSize}
        initialArea={mobileArea}
        lockViewerZoom={lockViewerZoom}
        // Writers double tap empty canvas to add a block.
        doubleTapZoom={!!props.preview || !entity_set.permissions.write}
      >
        <AddCanvasBlockButton
          entityID={props.entityID}
          entity_set={entity_set}
          fixedSize={fixedSize}
        />

        <div className="absolute top-6 right-3 sm:top-4 sm:right-4 z-20 flex flex-row gap-2 items-start">
          {!props.preview && !fixedSize && entity_set.permissions.write && (
            <MobileViewToggle entityID={props.entityID} />
          )}
          {!fixedSize && (
            <CanvasMetadata
              entityID={props.entityID}
              isSubpage={!props.first}
            />
          )}
        </div>
        {!props.preview && entity_set.permissions.write && (
          <CanvasFocusZoom pageEntityID={props.entityID} />
        )}

        {!props.preview && entity_set.permissions.write && (
          <InkToolbar pageID={props.entityID} />
        )}

        <CanvasZoomControls className="absolute left-2 bottom-2 sm:left-4 sm:bottom-4 z-10 bg-bg-page rounded-md px-1 py-0.5" />

        <CanvasZoomLayer contentHeight={contentHeight} mobileArea={mobileArea}>
          <CanvasContent {...props} />
        </CanvasZoomLayer>
      </CanvasZoomProvider>
    </div>
  );
}

export function CanvasContent(props: { entityID: string; preview?: boolean }) {
  let blocks = useEntity(props.entityID, "canvas/block");
  let { rep, undoManager } = useReplicache();
  let entity_set = useEntitySetContext();
  let fixedSize = useCanvasFixedSize(props.entityID);
  let contentHeight = canvasContentHeight(blocks.map((b) => b.data.position));
  let handleDrop = useHandleCanvasDrop(props.entityID);
  let stackOrders = useCanvasStackOrders(props.entityID);
  let inking = useInkSession((s) => s.page === props.entityID);

  return (
    <div
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
        if ((e.detail === 2 || e.ctrlKey || e.metaKey) && rep) {
          let parentRect = e.currentTarget.getBoundingClientRect();
          let zoom = getCanvasZoom(props.entityID);
          let position = {
            x: Math.max((e.clientX - parentRect.left) / zoom, 0),
            y: Math.max((e.clientY - parentRect.top) / zoom - 12, 0),
          };
          let newEntityID = await addCanvasTextBlock(rep, undoManager, {
            parent: props.entityID,
            position: fixedSize
              ? clampToCanvasSize(position, NEW_BLOCK_SIZE, fixedSize)
              : position,
            permission_set: entity_set.set,
          });
          focusBlock(
            { type: "text", parent: props.entityID, entityID: newEntityID },
            { type: "start" },
          );
        }
      }}
      onDragOver={
        !props.preview && entity_set.permissions.write
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
      onDrop={
        !props.preview && entity_set.permissions.write ? handleDrop : undefined
      }
      style={{
        ...(fixedSize
          ? { width: fixedSize.width, height: fixedSize.height }
          : { minHeight: contentHeight }),
        contain: "size layout paint",
      }}
      className={`relative ${fixedSize ? `bg-bg-page ${props.preview ? "" : "shadow-sm"}` : "h-full w-[1272px]"}`}
    >
      <CanvasBackground
        entityID={props.entityID}
        // An embedded canvas reads as a picture inline; the grid only helps placing
        // blocks while editing it.
        defaultPattern={fixedSize && props.preview ? "plain" : "grid"}
      />
      {!props.preview && !fixedSize && entity_set.permissions.write && (
        <MobileViewGuides entityID={props.entityID} />
      )}
      {!props.preview && entity_set.permissions.write && inking && (
        <CanvasInkLayer pageID={props.entityID} />
      )}
      {[...blocks]
        .sort((a, b) => canvasBlockOrder(a.data.position, b.data.position))
        .map((b) => {
          return (
            <CanvasBlock
              preview={props.preview}
              parent={props.entityID}
              entityID={b.data.value}
              position={b.data.position}
              factID={b.id}
              stackOrder={stackOrders.get(b.data.value)}
              fixedSize={fixedSize}
              key={b.data.value}
            />
          );
        })}
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
          Lock viewer zoom
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
  if (!pub || !pub.publications) return null;

  if (!normalizedPublication) return null;
  if (hasHeaderBlock) return null;
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

      {showMentions !== false ||
      showComments !== false ||
      showRecommends === false ? (
        <Separator classname="h-4!" />
      ) : null}
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
  entity_set: { set: string };
  fixedSize: CanvasSize | null;
}) => {
  let { rep, undoManager } = useReplicache();
  let { permissions } = useEntitySetContext();
  let blocks = useEntity(props.entityID, "canvas/block");

  if (!permissions.write) return null;
  return (
    <div className="absolute right-2 sm:bottom-4 sm:right-4 bottom-2 sm:top-auto z-10 flex flex-col gap-1 justify-center">
      <TooltipButton
        side="left"
        open={blocks.length === 0 ? true : undefined}
        tooltipContent={
          <div className="flex flex-col justify-end text-center px-1 leading-snug ">
            <div>Add a Block!</div>
            <div className="font-normal">or double click anywhere</div>
          </div>
        }
        className="w-fit p-2 rounded-full bg-accent-1 border-2 outline-solid outline-transparent hover:outline-1 hover:outline-accent-1 border-accent-1 text-accent-2"
        onMouseDown={() => {
          let page = document.getElementById(
            elementId.page(props.entityID).canvasScrollArea,
          );
          if (!page || !rep) return;
          let zoom = getCanvasZoom(props.entityID);
          let position = {
            x: (page.clientWidth + page.scrollLeft) / zoom - 468,
            y: 32 + page.scrollTop / zoom,
          };
          addCanvasTextBlock(rep, undoManager, {
            parent: props.entityID,
            position: props.fixedSize
              ? clampToCanvasSize(position, NEW_BLOCK_SIZE, props.fixedSize)
              : position,
            permission_set: props.entity_set.set,
          }).then((newEntityID) =>
            setTimeout(() => {
              focusBlock(
                { type: "text", entityID: newEntityID, parent: props.entityID },
                { type: "start" },
              );
            }, 20),
          );
        }}
      >
        <AddSmall />
      </TooltipButton>
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
  fixedSize: CanvasSize | null;
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
  let onDragEnd = useCallback(
    (dragPosition: { x: number; y: number }) => {
      if (!permissions.write) return;
      let zoom = getCanvasZoom(props.parent);
      let position = {
        x: props.position.x + dragPosition.x / zoom,
        y: props.position.y + dragPosition.y / zoom,
      };
      rep?.mutate.assertFact({
        id: props.factID,
        entity: props.parent,
        attribute: "canvas/block",
        data: {
          type: "spatial-reference",
          value: props.entityID,
          position: props.fixedSize
            ? clampToCanvasSize(
                position,
                { width, height: rect.height / zoom },
                props.fixedSize,
              )
            : position,
        },
      });
    },
    [props, rep, permissions, width, rect.height],
  );
  let { dragDelta, handlers: dragHandlers } = useDrag({
    onDragEnd,
  });

  let widthOnDragEnd = useCallback(
    (dragPosition: { x: number; y: number }) => {
      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: "canvas/block/width",
        data: {
          type: "number",
          value: width + dragPosition.x / getCanvasZoom(props.parent),
        },
      });
    },
    [props, rep, width],
  );
  let widthHandle = useDrag({ onDragEnd: widthOnDragEnd });

  let RotateOnDragEnd = useCallback(
    (dragDelta: { x: number; y: number }) => {
      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: "canvas/block/rotation",
        data: {
          type: "number",
          value: Math.round(rotation + rotationDelta(rect, dragDelta)) % 360,
        },
      });
    },
    [props, rep, rect, rotation],
  );
  let rotateHandle = useDrag({ onDragEnd: RotateOnDragEnd });

  let { isLongPress, longPressHandlers: longPressHandlers } = useLongPress(
    () => {
      if (isLongPress.current && permissions.write && !isGroup) {
        focusBlock(
          {
            type: type?.data.value || "text",
            entityID: props.entityID,
            parent: props.parent,
          },
          { type: "start" },
        );
      }
    },
  );
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
  // Editing inside a group keeps the group's handles up.
  let isFocused = useUIState(
    (s) =>
      s.focusedEntity?.entityID === props.entityID ||
      (isGroup &&
        s.focusedEntity?.entityType === "block" &&
        s.focusedEntity.parent === props.entityID),
  );

  return (
    <div
      ref={ref}
      {...(!props.preview ? { ...longPressHandlers, ...mouseHandlers } : {})}
      id={props.preview ? undefined : elementId.block(props.entityID).container}
      className={`canvasBlockWrapper absolute group/canvas-block rounded-lg flex items-stretch origin-center p-3`}
      style={{
        top: 0,
        left: 0,
        // Only the block being dragged lifts out of its layer. Lifting on
        // focus too would hide the effect of the layering buttons, which act
        // on the block that is focused.
        zIndex: dragDelta ? CANVAS_DRAG_STACK_ORDER : props.stackOrder,
        width: width + (widthHandle.dragDelta?.x || 0) / liveZoom,
        transform,
      }}
    >
      {!props.preview && permissions.write && (
        <Gripper isFocused={isFocused} {...dragHandlers} />
      )}

      <div
        className={` w-full ${dragDelta || widthHandle.dragDelta || rotateHandle.dragDelta ? "pointer-events-none" : ""} `}
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

      {!props.preview && permissions.write && (
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

      {!props.preview && permissions.write && (
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
  if (props.pattern === "grid")
    return (
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none text-border-light"
      >
        <defs>
          <pattern
            id={patternID}
            x="0"
            y="0"
            width={props.scale ? 32 * props.scale : 32}
            height={props.scale ? 32 * props.scale : 32}
            viewBox={`${props.scale ? 16 * props.scale : 0} ${props.scale ? 16 * props.scale : 0} ${props.scale ? 32 * props.scale : 32} ${props.scale ? 32 * props.scale : 32}`}
            patternUnits="userSpaceOnUse"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M16.5 0H15.5L15.5 2.06061C15.5 2.33675 15.7239 2.56061 16 2.56061C16.2761 2.56061 16.5 2.33675 16.5 2.06061V0ZM0 16.5V15.5L2.06061 15.5C2.33675 15.5 2.56061 15.7239 2.56061 16C2.56061 16.2761 2.33675 16.5 2.06061 16.5L0 16.5ZM16.5 32H15.5V29.9394C15.5 29.6633 15.7239 29.4394 16 29.4394C16.2761 29.4394 16.5 29.6633 16.5 29.9394V32ZM32 15.5V16.5L29.9394 16.5C29.6633 16.5 29.4394 16.2761 29.4394 16C29.4394 15.7239 29.6633 15.5 29.9394 15.5H32ZM5.4394 16C5.4394 15.7239 5.66325 15.5 5.93939 15.5H10.0606C10.3367 15.5 10.5606 15.7239 10.5606 16C10.5606 16.2761 10.3368 16.5 10.0606 16.5H5.9394C5.66325 16.5 5.4394 16.2761 5.4394 16ZM13.4394 16C13.4394 15.7239 13.6633 15.5 13.9394 15.5H15.5V13.9394C15.5 13.6633 15.7239 13.4394 16 13.4394C16.2761 13.4394 16.5 13.6633 16.5 13.9394V15.5H18.0606C18.3367 15.5 18.5606 15.7239 18.5606 16C18.5606 16.2761 18.3367 16.5 18.0606 16.5H16.5V18.0606C16.5 18.3367 16.2761 18.5606 16 18.5606C15.7239 18.5606 15.5 18.3367 15.5 18.0606V16.5H13.9394C13.6633 16.5 13.4394 16.2761 13.4394 16ZM21.4394 16C21.4394 15.7239 21.6633 15.5 21.9394 15.5H26.0606C26.3367 15.5 26.5606 15.7239 26.5606 16C26.5606 16.2761 26.3367 16.5 26.0606 16.5H21.9394C21.6633 16.5 21.4394 16.2761 21.4394 16ZM16 5.4394C16.2761 5.4394 16.5 5.66325 16.5 5.93939V10.0606C16.5 10.3367 16.2761 10.5606 16 10.5606C15.7239 10.5606 15.5 10.3368 15.5 10.0606V5.9394C15.5 5.66325 15.7239 5.4394 16 5.4394ZM16 21.4394C16.2761 21.4394 16.5 21.6633 16.5 21.9394V26.0606C16.5 26.3367 16.2761 26.5606 16 26.5606C15.7239 26.5606 15.5 26.3367 15.5 26.0606V21.9394C15.5 21.6633 15.7239 21.4394 16 21.4394Z"
              fill="currentColor"
            />
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

  if (props.pattern === "dot") {
    return (
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className={`pointer-events-none text-border`}
      >
        <defs>
          <pattern
            id={patternID}
            x="0"
            y="0"
            width={props.scale ? 24 * props.scale : 24}
            height={props.scale ? 24 * props.scale : 24}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={props.scale ? 12 * props.scale : 12}
              cy={props.scale ? 12 * props.scale : 12}
              r="1"
              fill="currentColor"
            />
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
  }
};

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

// addCanvasBlock writes a fact per attribute; the group keeps placing a block
// a single Cmd-Z rather than one per fact, held open until the mutation
// settles.
async function addCanvasTextBlock(
  rep: Replicache<ReplicacheMutators>,
  undoManager: UndoManager,
  args: {
    parent: string;
    position: { x: number; y: number };
    permission_set: string;
  },
) {
  let newEntityID = v7();
  await undoManager.withUndoGroup(() =>
    rep.mutate.addCanvasBlock({
      ...args,
      newEntityID,
      factID: v7(),
      type: "text",
    }),
  );
  return newEntityID;
}

// A new text block's footprint, for keeping it inside a fixed canvas.
const NEW_BLOCK_SIZE = { width: 360, height: 48 };

// Degrees the rotate handle has swept around the block's center, from its
// resting spot at the block's bottom-right corner.
function rotationDelta(
  rect: { x: number; y: number; width: number; height: number },
  dragDelta: { x: number; y: number },
) {
  let corner = { x: rect.x + rect.width, y: rect.y + rect.height };
  let origin = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  let dragged = { x: corner.x + dragDelta.x, y: corner.y + dragDelta.y };
  if (origin.x === dragged.x && origin.y === dragged.y) return 0;
  return (
    (Math.atan2(dragged.y - origin.y, dragged.x - origin.x) -
      Math.atan2(corner.y - origin.y, corner.x - origin.x)) *
    (180 / Math.PI)
  );
}
