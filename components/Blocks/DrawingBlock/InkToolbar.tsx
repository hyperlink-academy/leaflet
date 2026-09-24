import { useReplicache } from "src/replicache";
import { Popover } from "components/Popover";
import { ButtonPrimary } from "components/Buttons";
import { EraserSmall } from "components/Icons/EraserSmall";
import { INK_COLORS, INK_SIZES, inkColor } from "./ink";
import { useInkSession } from "./useInkSession";
import { stopInk } from "./inkMutations";

export function InkToolbar(props: { pageID: string }) {
  let { rep, undoManager } = useReplicache();
  let active = useInkSession((s) => s.page === props.pageID);
  let tool = useInkSession((s) => s.tool);
  let color = useInkSession((s) => s.color);
  let size = useInkSession((s) => s.size);
  let { setColor, setSize, setTool } = useInkSession.getState();
  if (!active) return null;

  return (
    <div className="inkToolbar absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-bg-page border border-border rounded-full shadow-sm pl-2 pr-1 py-1">
      <Popover
        asChild
        side="bottom"
        className="grid! grid-cols-6 gap-1.5 p-2!"
        trigger={
          <button
            aria-label="Ink color"
            title="Ink color"
            className="shrink-0 w-6 h-6 rounded-full border-2 border-border-light outline-1 outline-border"
            style={{ backgroundColor: inkColor(color) }}
          />
        }
      >
        {INK_COLORS.map((c) => (
          <button
            key={c.value}
            aria-label={c.label}
            title={c.label}
            onClick={() => setColor(c.value)}
            className={`w-6 h-6 rounded-full border border-border outline-2 outline-offset-1 ${color === c.value ? "outline-accent-contrast" : "outline-transparent hover:outline-border"}`}
            style={{ backgroundColor: inkColor(c.value) }}
          />
        ))}
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

      <ButtonPrimary
        compact
        className="ml-1 rounded-full! px-2!"
        onClick={() => stopInk(rep, undoManager)}
      >
        Done
      </ButtonPrimary>
    </div>
  );
}
