"use client";
import { BlockProps, BlockLayout } from "./Block";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected, useUIState } from "src/useUIState";
import { focusPage } from "src/utils/focusPage";
import { CanvasContent } from "components/Canvas";
import { CardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { useCanvasSize } from "src/hooks/queries/useCanvasSize";
import { ScaledCanvas } from "./ScaledCanvas";
import { useEntitySetContext } from "components/EntitySetProvider";
import { EditTiny } from "components/Icons/EditTiny";
import { BlockSettings } from "./SettingsTriggerButton";
import { BlockSettingOptions } from "./BlockSettingOptions";
import {
  type CanvasSize,
  EMBEDDED_CANVAS_SIZES,
  type EmbeddedCanvasSizeName,
  embeddedCanvasSizeName,
} from "src/utils/embeddedCanvasSize";

export function EmbeddedCanvasBlock(
  props: BlockProps & {
    preview?: boolean;
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) {
  let page = useEntity(props.entityID, "block/card")?.data.value;
  let size = useCanvasSize(page || null);
  let isSelected = useIsBlockSelected(props.entityID);
  let isOpen = useUIState((s) => !!page && s.openPages.includes(page));
  if (!page || !size.fixed) return null;

  return (
    <CardThemeProvider entityID={page}>
      <BlockLayout
        isSelected={!!isSelected}
        areYouSure={props.areYouSure}
        setAreYouSure={props.setAreYouSure}
        extraOptions={<EmbeddedCanvasSizeSettings page={page} size={size} />}
        className={`embeddedCanvasBlockWrapper relative p-0! ${isOpen ? "border-accent-contrast! outline-accent-contrast!" : ""}`}
      >
        <ScaledCanvas size={size} inert>
          <CanvasContent entityID={page} preview />
        </ScaledCanvas>
        {!props.preview && (
          <EditEmbeddedCanvasButton parent={props.parent} page={page} />
        )}
      </BlockLayout>
    </CardThemeProvider>
  );
}

function EditEmbeddedCanvasButton(props: { parent: string; page: string }) {
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  if (!permissions.write) return null;
  return (
    <button
      aria-label="Edit drawing"
      className="absolute top-2 right-2 flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold bg-accent-1 text-accent-2 hover:outline-solid hover:outline-1 hover:outline-accent-1 outline-offset-1"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        useUIState.getState().openPage(props.parent, props.page);
        if (rep) focusPage(props.page, rep);
      }}
    >
      <EditTiny /> Edit
    </button>
  );
}

function EmbeddedCanvasSizeSettings(props: { page: string; size: CanvasSize }) {
  let { rep, undoManager } = useReplicache();
  let current = embeddedCanvasSizeName(props.size);
  return (
    <BlockSettings label="Drawing" className="w-md">
      <h4>Drawing Size</h4>
      <BlockSettingOptions<EmbeddedCanvasSizeName>
        options={(
          Object.keys(EMBEDDED_CANVAS_SIZES) as EmbeddedCanvasSizeName[]
        ).map((value) => ({
          value,
          Icon: ({ selected }) => (
            <SizeIcon size={EMBEDDED_CANVAS_SIZES[value]} selected={selected} />
          ),
        }))}
        // A size set outside the presets highlights none of them.
        value={current ?? ("" as EmbeddedCanvasSizeName)}
        onSelect={async (value) => {
          if (!rep) return;
          let { width, height } = EMBEDDED_CANVAS_SIZES[value];
          await undoManager.withUndoGroup(() =>
            rep.mutate.assertFact([
              {
                entity: props.page,
                attribute: "canvas/fixed-width",
                data: { type: "number", value: width },
              },
              {
                entity: props.page,
                attribute: "canvas/fixed-height",
                data: { type: "number", value: height },
              },
            ]),
          );
        }}
      />
    </BlockSettings>
  );
}

const SizeIcon = (props: { size: CanvasSize; selected: boolean }) => {
  let scale = Math.min(56 / props.size.width, 48 / props.size.height);
  return (
    <div className="flex items-center justify-center w-full h-[48px]">
      <div
        className={`opaque-container border-tertiary! ${props.selected ? "border-accent-contrast!" : ""}`}
        style={{
          width: props.size.width * scale,
          height: props.size.height * scale,
        }}
      />
    </div>
  );
};
