"use client";
import { BlockProps, BlockLayout } from "components/Blocks/Block";
import { useUIState } from "src/useUIState";

export function RSVPBlock(props: BlockProps) {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  return (
    <BlockLayout
      isSelected={!!isSelected}
      className="rsvp relative flex flex-col gap-1 w-full rounded-lg place-items-center justify-center"
    >
      <p className="text-tertiary italic text-sm py-4">
        The RSVP block has been deprecated.
      </p>
    </BlockLayout>
  );
}
