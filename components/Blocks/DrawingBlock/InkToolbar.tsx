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
import { EraserSmall } from "components/Icons/EraserSmall";
import { PaintSmall } from "components/Icons/PaintSmall";
import { CloseTiny } from "components/Icons/CloseTiny";
import { INK_COLORS, INK_SIZES, inkColor } from "./ink";
import { useInkSession } from "./useInkSession";
import { cancelInk } from "./inkMutations";

export function InkToolbar(props: { pageID: string }) {
  let { rep, undoManager } = useReplicache();
  let active = useInkSession((s) => s.page === props.pageID);
  let tool = useInkSession((s) => s.tool);
  let color = useInkSession((s) => s.color);
  let size = useInkSession((s) => s.size);
  let customColor = useInkSession((s) => s.customColor);
  let hasTarget = useInkSession((s) => !!s.target);
  let { setColor, setCustomColor, setSize, setTool } = useInkSession.getState();
  if (!active) return null;

  return (
    <div className="inkToolbar absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-bg-page border border-border rounded-full shadow-sm px-1 py-1">
      <Popover
        asChild
        side="bottom"
        className="w-[184px]"
        trigger={
          <button
            aria-label="Ink color"
            title="Ink color"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-border-light"
            style={{ color: inkColor(color) }}
          >
            <PaintSmall />
          </button>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            {[...INK_COLORS, { value: customColor, label: "Custom" }].map(
              (c) => (
                <button
                  key={c.label}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 shrink-0 rounded-full border border-border outline-2 outline-offset-1 ${color === c.value ? "outline-accent-contrast" : "outline-transparent hover:outline-border"}`}
                  style={{ backgroundColor: inkColor(c.value) }}
                />
              ),
            )}
          </div>
          <ColorPicker
            value={parseColor(customColor)}
            onChange={(c) => setCustomColor(c.toString("hex"))}
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

      {INK_SIZES.map((s) => {
        let selected = tool === "pen" && size === s;
        return (
          <button
            key={s}
            aria-label={`Pen size ${s}`}
            title="Pen size"
            onClick={() => setSize(s)}
            className={`w-7 h-7 flex items-center justify-center rounded-full ${selected ? "bg-border-light" : "hover:bg-border-light"}`}
          >
            <span
              className="rounded-full"
              style={{
                width: s + 2,
                height: s + 2,
                backgroundColor: inkColor(color),
              }}
            />
          </button>
        );
      })}

      <button
        aria-label="Eraser"
        title="Eraser"
        onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
        className={`w-7 h-7 flex items-center justify-center rounded-full ${tool === "eraser" ? "bg-border-light text-primary" : "text-tertiary hover:bg-border-light"}`}
      >
        <EraserSmall width={18} height={18} />
      </button>

      {/* Once there is a drawing, done and cancel sit on its frame. */}
      {!hasTarget && (
        <button
          aria-label="Stop drawing"
          title="Stop drawing"
          onClick={() => cancelInk(rep, undoManager)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-tertiary hover:bg-border-light"
        >
          <CloseTiny />
        </button>
      )}
    </div>
  );
}
