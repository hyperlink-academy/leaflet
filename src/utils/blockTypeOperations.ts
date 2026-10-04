import { Block } from "components/Blocks/Block";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import type { UndoManager } from "src/undoManager";
import { isTextBlock } from "./isTextBlock";

// Title/Heading/Subheading, Text/Large/Small, Quote and Drop Cap are one
// mutually exclusive group in the UI, so they share a single setter — picking
// any of them has to clear whichever of block/heading-level, block/text-size
// and block/dropcap the previous choice left behind.
export type TextBlockStyle =
  | { style: "heading"; level: number }
  | { style: "blockquote" }
  | { style: "dropcap" }
  | { style: "text"; size: "default" | "small" | "large" };

export async function setTextBlockStyle(
  blocks: Block[],
  style: TextBlockStyle,
  rep?: Replicache<ReplicacheMutators> | null,
  undoManager?: UndoManager,
) {
  if (!rep) return;
  let targets = blocks.filter((b) => isTextBlock[b.type]);
  if (targets.length === 0) return;

  let run = async () => {
    for (let block of targets) {
      if (style.style !== "dropcap")
        await rep.mutate.retractAttribute({
          entity: block.entityID,
          attribute: "block/dropcap",
        });
      if (style.style === "heading") {
        await rep.mutate.assertFact({
          entity: block.entityID,
          attribute: "block/heading-level",
          data: { type: "number", value: style.level },
        });
        await rep.mutate.assertFact({
          entity: block.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "heading" },
        });
        continue;
      }

      await rep.mutate.retractAttribute({
        entity: block.entityID,
        attribute: "block/heading-level",
      });
      await rep.mutate.assertFact({
        entity: block.entityID,
        attribute: "block/type",
        data: {
          type: "block-type-union",
          value: style.style === "dropcap" ? "text" : style.style,
        },
      });
      if (style.style === "dropcap") {
        await rep.mutate.retractAttribute({
          entity: block.entityID,
          attribute: "block/text-size",
        });
        await rep.mutate.assertFact({
          entity: block.entityID,
          attribute: "block/dropcap",
          data: { type: "boolean", value: true },
        });
      }
      if (style.style === "text") {
        if (style.size === "default")
          await rep.mutate.retractAttribute({
            entity: block.entityID,
            attribute: "block/text-size",
          });
        else
          await rep.mutate.assertFact({
            entity: block.entityID,
            attribute: "block/text-size",
            data: { type: "text-size-union", value: style.size },
          });
      }
    }
  };
  if (undoManager) await undoManager.withUndoGroup(run);
  else await run();
}
