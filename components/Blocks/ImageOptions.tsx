import { useEffect, useState } from "react";
import * as Slider from "@radix-ui/react-slider";

import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  useLeafletPublicationData,
  useLeafletPublicationPage,
} from "components/PageSWRDataProvider";
import { setCoverImageFromEntity } from "src/utils/setCoverImageFromEntity";

import { Popover } from "components/Popover";
import { Input } from "components/Input";
import { Toggle } from "components/Toggle";

import { SettingsTriggerButton } from "./SettingsTriggerButton";

export function ImageOptions(props: {
  entityID: string;
  onPreviewWidth?: (width: number | null) => void;
}) {
  let { rep } = useReplicache();
  let image = useEntity(props.entityID, "block/image");
  let isFullBleed = !!useEntity(props.entityID, "image/full-bleed")?.data.value;
  if (!image) return null;

  return (
    <Popover
      asChild
      side="top"
      align="end"
      sideOffset={6}
      className="w-sm"
      trigger={<SettingsTriggerButton aria-label="Image Settings" />}
    >
      <div className="flex flex-col gap-3 text-primary py-1 min-w-[220px]">
        <CoverImageControl entityID={props.entityID} />
        <Toggle
          fullWidth
          toggle={isFullBleed}
          onToggle={() =>
            rep?.mutate.assertFact({
              entity: props.entityID,
              attribute: "image/full-bleed",
              data: { type: "boolean", value: !isFullBleed },
            })
          }
        >
          <div className={`${isFullBleed ? "font-bold" : "text-tertiary"}`}>
            Make Full Bleed
          </div>
        </Toggle>
        <MaxWidthControl
          entityID={props.entityID}
          intrinsicWidth={image.data.width}
          onPreviewWidth={props.onPreviewWidth}
          disabled={isFullBleed}
        />
      </div>
    </Popover>
  );
}

// Horizontal padding around a block (px-4 on each side at sm and up), which the
// image sits inside — so a non-full-bleed image can only ever be this much
// narrower than the page width.
const PAGE_PADDING = 32;

function MaxWidthControl(props: {
  entityID: string;
  intrinsicWidth: number;
  disabled?: boolean;
  onPreviewWidth?: (width: number | null) => void;
}) {
  let { rep, rootEntity } = useReplicache();
  let { data: pubData, normalizedPublication } = useLeafletPublicationData();
  // Publication drafts carry page width on the publication record, not on the
  // leaflet's theme facts; standalone docs use the leaflet theme.
  let entityPageWidth = useEntity(rootEntity, "theme/page-width")?.data.value;
  let pageWidth =
    (pubData?.publications
      ? normalizedPublication?.theme?.pageWidth
      : entityPageWidth) || 624;

  let maxWidth = useEntity(props.entityID, "image/max-width")?.data.value;

  const MAX_WIDTH_MIN = 100;
  const MAX_WIDTH_MAX = pageWidth - PAGE_PADDING;
  const MAX_WIDTH_STEP = 10;

  // With no explicit width, the image renders at its intrinsic width capped to
  // the page content area — mirror that as the slider's starting value.
  let defaultWidth = Math.min(props.intrinsicWidth, MAX_WIDTH_MAX);
  // Interim value lets the slider/input update live; committed to the fact on
  // release (slider) or blur/Enter (input).
  let [interim, setInterim] = useState(maxWidth ?? defaultWidth);
  useEffect(
    () => setInterim(maxWidth ?? defaultWidth),
    [maxWidth, defaultWidth],
  );

  let sliderValue = Number.isNaN(interim)
    ? defaultWidth
    : Math.max(MAX_WIDTH_MIN, Math.min(MAX_WIDTH_MAX, interim));

  // Live-preview the width in the editor as the slider/input changes, before
  // the value is committed to the fact on release.
  let preview = (value: number) => {
    setInterim(value);
    if (!Number.isNaN(value))
      props.onPreviewWidth?.(
        Math.max(MAX_WIDTH_MIN, Math.min(MAX_WIDTH_MAX, value)),
      );
  };

  let commit = (value: number) => {
    let clamped = Math.max(
      MAX_WIDTH_MIN,
      Math.min(MAX_WIDTH_MAX, Number.isNaN(value) ? defaultWidth : value),
    );
    setInterim(clamped);
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "image/max-width",
      data: { type: "number", value: clamped },
    });
    // Hand rendering back to the committed fact.
    props.onPreviewWidth?.(null);
  };

  return (
    <div
      className={`flex flex-col gap-1 ${props.disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <label className="flex items-center justify-between gap-2 ">
        <span className="font-bold">Width</span>
        <Input
          type="number"
          disabled={props.disabled}
          min={MAX_WIDTH_MIN}
          max={MAX_WIDTH_MAX}
          className="w-20 input-with-border"
          value={Number.isNaN(interim) ? "" : String(interim)}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => preview(parseInt(e.currentTarget.value))}
          onBlur={() => commit(interim)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(interim);
            }
          }}
        />
      </label>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-fit px-1"
        disabled={props.disabled}
        value={[sliderValue]}
        min={MAX_WIDTH_MIN}
        max={MAX_WIDTH_MAX}
        step={MAX_WIDTH_STEP}
        onValueChange={(value) => preview(value[0])}
        onValueCommit={(value) => commit(value[0])}
      >
        <Slider.Track className="bg-border-light relative grow rounded-full h-[3px] my-2">
          <Slider.Range className="absolute bg-accent-contrast rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-4 h-4 rounded-full border-2 border-bg-page bg-accent-contrast cursor-pointer"
          aria-label="Image width"
        />
      </Slider.Root>
    </div>
  );
}

function CoverImageControl(props: { entityID: string }) {
  let { rep, rootEntity } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: pubData } = useLeafletPublicationData();
  let publicationPage = useLeafletPublicationPage();
  let image = useEntity(props.entityID, "block/image");
  let alt = useEntity(props.entityID, "image/alt")?.data.value;
  let coverEntity = useEntity(rootEntity, "root/cover-image")?.data.value;
  let coverImage = useEntity(coverEntity ?? null, "block/image");

  // Only show in a publication, with write permissions, and an image to copy.
  // Publication pages (e.g. an About page) have no cover image.
  if (
    !pubData?.publications ||
    !entity_set.permissions.write ||
    publicationPage ||
    !image
  )
    return null;

  // The cover is a standalone copy sharing this block's src, so a matching src
  // means this block is the current cover.
  let isCoverImage = !!coverImage && coverImage.data.src === image.data.src;

  return (
    <>
      <Toggle
        fullWidth
        toggle={isCoverImage}
        onToggle={async () => {
          if (!rep) return;
          if (isCoverImage) {
            if (coverEntity)
              await rep.mutate.deleteEntity({ entity: coverEntity });
          } else {
            await setCoverImageFromEntity(rep, {
              rootEntity,
              permission_set: entity_set.set,
              image: image.data,
              alt,
            });
          }
        }}
      >
        <div className={`${isCoverImage ? "font-bold" : "text-teriary"}`}>
          Use as Cover Image
        </div>
      </Toggle>
      <hr className="border-border-light" />
    </>
  );
}
