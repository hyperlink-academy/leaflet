"use client";

import { useEffect, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { useEntity, useReplicache } from "src/replicache";
import { addImage } from "src/utils/addImage";
import { Radio } from "components/Checkbox";
import { Input } from "components/Input";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";

const DEFAULT_WORDMARK_WIDTH = 200;
const MIN_WORDMARK_WIDTH = 40;

// Wordmark editing backed by theme/wordmark-* facts on the draft leaflet root.
// Edits persist as draft state and go live on the next publish (see
// extractThemeFromFacts), mirroring how the background image is handled.
export function useDraftWordmark() {
  let { rep, undoManager, rootEntity } = useReplicache();
  let imageFact = useEntity(rootEntity, "theme/wordmark-image");
  let widthFact = useEntity(rootEntity, "theme/wordmark-width");
  let pageWidth = useEntity(rootEntity, "theme/page-width")?.data.value || 624;

  let src = imageFact?.data.src ?? null;
  let width = widthFact?.data.value ?? null;

  let setImage = async (file: File) => {
    if (!rep) return;
    await undoManager.withUndoGroup(async () => {
      await addImage(file, rep, {
        entityID: rootEntity,
        attribute: "theme/wordmark-image",
      });
      // Give a sane starting max width so the slider and preview agree.
      if (width == null)
        await rep.mutate.assertFact({
          entity: rootEntity,
          attribute: "theme/wordmark-width",
          data: { type: "number", value: DEFAULT_WORDMARK_WIDTH },
        });
    });
  };

  let setWidth = (w: number) => {
    rep?.mutate.assertFact({
      entity: rootEntity,
      attribute: "theme/wordmark-width",
      data: { type: "number", value: w },
    });
  };

  let remove = async () => {
    await rep?.mutate.retractAttribute({
      entity: rootEntity,
      attribute: ["theme/wordmark-image", "theme/wordmark-width"],
    });
  };

  return { src, width, pageWidth, setImage, setWidth, remove };
}

// Popover body for choosing between the logo and an uploaded wordmark image,
// adjusting its max width, and removing it. Lives inside the draft editor.
export function WordmarkEditor() {
  let { src, width, pageWidth, setImage, setWidth, remove } =
    useDraftWordmark();
  let [mode, setMode] = useState<"logo" | "wordmark">(
    src ? "wordmark" : "logo",
  );

  let sliderWidth = width ?? DEFAULT_WORDMARK_WIDTH;
  // Interim value keeps the number input and slider in sync while editing;
  // committed back to draft state on slider release / input blur.
  let [interimWidth, setInterimWidth] = useState(sliderWidth);
  useEffect(() => setInterimWidth(sliderWidth), [sliderWidth]);

  let commitWidth = (value: number) => {
    let clamped = isNaN(value)
      ? sliderWidth
      : Math.max(MIN_WORDMARK_WIDTH, Math.min(pageWidth, value));
    setInterimWidth(clamped);
    setWidth(clamped);
  };

  let onRemove = async () => {
    setMode("logo");
    await remove();
  };

  return (
    <div className="wordmarkEditor flex flex-col gap-3 w-xs text-primary">
      <h3 className="font-bold text-primary">Header Options</h3>

      <Radio
        type="radio"
        id="wordmark-mode-logo"
        name="wordmark-mode"
        value="logo"
        checked={mode === "logo"}
        onChange={(e) => {
          if (!e.currentTarget.checked) return;
          setMode("logo");
          if (src) onRemove();
        }}
      >
        <div className="flex flex-col leading-snug">
          <div className="font-bold text-primary">
            Use Logo and Publication Name
          </div>
          {mode === "wordmark" && (
            <div className="text-sm font-normal text-teritary">
              Logo will still appear in links and previews of this publication
            </div>
          )}
        </div>
      </Radio>

      <hr className="border-0 border-t border-border-light" />

      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Radio
            type="radio"
            id="wordmark-mode-wordmark"
            name="wordmark-mode"
            value="wordmark"
            checked={mode === "wordmark"}
            onChange={(e) => {
              if (!e.currentTarget.checked) return;
              setMode("wordmark");
            }}
          >
            <div className="font-bold text-primary">Use Wordmark</div>
          </Radio>
          {mode === "wordmark" && src && (
            <button
              type="button"
              className="shrink-0 text-accent-contrast"
              onClick={onRemove}
            >
              Remove
            </button>
          )}
        </div>

        {mode === "wordmark" && (
          <div className="flex flex-col gap-2 pl-5">
            {src ? (
              <>
                <div className="flex items-center justify-center rounded-md border border-border-light bg-bg-page p-2">
                  <img
                    src={src}
                    alt="Wordmark preview"
                    className="h-auto object-contain"
                    style={{ width: `${interimWidth}px`, maxWidth: "100%" }}
                  />
                </div>

                <div className="flex flex-col ">
                  <div className="flex justify-between items-center  text-secondary">
                    Max width
                    <div className="flex font-normal text-tertiary">
                      <Input
                        type="number"
                        className="w-10 text-right appearance-none bg-transparent"
                        max={pageWidth}
                        min={MIN_WORDMARK_WIDTH}
                        value={interimWidth}
                        onChange={(e) =>
                          setInterimWidth(parseInt(e.currentTarget.value))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            e.preventDefault();
                            commitWidth(interimWidth);
                          }
                        }}
                        onBlur={() => commitWidth(interimWidth)}
                      />
                      px
                    </div>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-fit px-1"
                    value={[interimWidth]}
                    max={pageWidth}
                    min={MIN_WORDMARK_WIDTH}
                    step={5}
                    onValueChange={(v) => setInterimWidth(v[0])}
                    onValueCommit={(v) => setWidth(v[0])}
                  >
                    <Slider.Track className="bg-border relative grow rounded-full h-[3px] my-2">
                      <Slider.Range className="absolute bg-accent-contrast rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="flex w-4 h-4 rounded-full border-2 border-white bg-accent-contrast shadow-[0_0_0_1px_rgb(var(--border))] cursor-pointer"
                      aria-label="Wordmark max width"
                    />
                  </Slider.Root>
                </div>
              </>
            ) : (
              <label
                className="group/wordmark-upload flex items-center justify-center gap-2 h-[104px] w-full rounded-lg border border-dashed border-border bg-[var(--accent-light)] cursor-pointer text-tertiary hover:font-bold hover:text-accent-contrast hover:border-accent-contrast"
                onMouseDown={(e) => e.preventDefault()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) setImage(file);
                }}
              >
                <BlockImageSmall className="shrink-0 text-border group-hover/wordmark-upload:text-accent-contrast" />
                Upload Wordmark
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImage(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
