import { Fragment } from "react";
import {
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorThumb,
  Input,
  SliderTrack,
  parseColor,
} from "react-aria-components";
import { useReplicache } from "src/replicache";
import { thumbStyle } from "components/ThemeManager/Pickers/ColorPicker";
import { Popover } from "components/Popover";
import { Separator } from "components/Layout";
import { EraserSmall } from "components/Icons/EraserSmall";
import { PaintBucketSmall } from "components/Icons/PaintBucketSmall";
import { PaintSmall } from "components/Icons/PaintSmall";
import { CloseTiny } from "components/Icons/CloseTiny";
import { INK_COLORS, INK_SIZES, inkColor } from "./ink";
import { useInkSession } from "./useInkSession";
import { stopInk } from "./inkMutations";

export function InkToolbar(props: { pageID: string }) {
  let { rep, undoManager } = useReplicache();
  let ink = useInkSession();
  if (ink.page !== props.pageID) return null;

  return (
    <div className="inkToolbar absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-bg-page border border-border rounded-full shadow-sm px-1 py-1">
      <Popover
        asChild
        open={ink.colorPickerOpen}
        onOpenChange={ink.setColorPickerOpen}
        side="bottom"
        className="w-[172px]"
        trigger={
          <button
            aria-label="Ink color"
            title="Ink color"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-border-light"
            style={{ color: inkColor(ink.color) }}
          >
            <PaintSmall />
          </button>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            {[
              ...INK_COLORS,
              { value: ink.customColor, label: "Custom color" },
            ].map((c, i) => (
              <Fragment key={c.label}>
                {i === INK_COLORS.length && (
                  <Separator classname="h-5! mx-0.5" />
                )}
                <button
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => ink.setColor(c.value)}
                  className={`w-6 h-6 shrink-0 rounded-full border border-border outline-2 outline-offset-1 ${ink.color === c.value ? "outline-accent-contrast" : "outline-transparent hover:outline-border"}`}
                  style={{ backgroundColor: inkColor(c.value) }}
                />
              </Fragment>
            ))}
          </div>
          <ColorPicker
            value={parseColor(ink.customColor)}
            onChange={(c) => ink.setCustomColor(c.toString("hex"))}
          >
            <ColorArea
              className="w-full h-[128px] rounded-md"
              colorSpace="hsb"
              xChannel="saturation"
              yChannel="brightness"
            >
              <ColorThumb className={thumbStyle} />
            </ColorArea>
            <ColorSlider colorSpace="hsb" className="w-full" channel="hue">
              <SliderTrack className="h-2 w-full rounded-md">
                <ColorThumb className={`${thumbStyle} mt-[4px]`} />
              </SliderTrack>
            </ColorSlider>
            <ColorField aria-label="Hex color" className="w-full">
              <Input
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="input-with-border w-full py-0.5! text-sm"
              />
            </ColorField>
          </ColorPicker>
        </div>
      </Popover>

      {INK_SIZES.map((s) => (
        <button
          key={s}
          aria-label={`Pen size ${s}`}
          title="Pen size"
          onClick={() => ink.setSize(s)}
          className={`w-7 h-7 flex items-center justify-center rounded-full ${ink.tool === "pen" && ink.size === s ? "bg-border-light" : "hover:bg-border-light"}`}
        >
          <span
            className="rounded-full"
            style={{
              width: s + 2,
              height: s + 2,
              backgroundColor: inkColor(ink.color),
            }}
          />
        </button>
      ))}

      <button
        aria-label="Fill"
        title="Fill a closed shape"
        onClick={() => ink.setTool(ink.tool === "fill" ? "pen" : "fill")}
        className={`w-7 h-7 flex items-center justify-center rounded-full ${ink.tool === "fill" ? "bg-border-light text-primary" : "text-tertiary hover:bg-border-light"}`}
      >
        <PaintBucketSmall width={18} height={18} />
      </button>

      <button
        aria-label="Eraser"
        title="Eraser"
        onClick={() => ink.setTool(ink.tool === "eraser" ? "pen" : "eraser")}
        className={`w-7 h-7 flex items-center justify-center rounded-full ${ink.tool === "eraser" ? "bg-border-light text-primary" : "text-tertiary hover:bg-border-light"}`}
      >
        <EraserSmall width={18} height={18} />
      </button>

      {/* Once there is a drawing, done sits on its frame. */}
      {!ink.target && (
        <button
          aria-label="Stop drawing"
          title="Stop drawing"
          onClick={() => stopInk(rep, undoManager)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-tertiary hover:bg-border-light"
        >
          <CloseTiny />
        </button>
      )}
    </div>
  );
}
