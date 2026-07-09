import { useUIState } from "src/useUIState";
import { LockTiny } from "components/Icons/LockTiny";
import { BlockProps } from "./Block";

export const MembersOnlyDelimiterBlock = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  return (
    <div
      className={`my-2 w-full flex items-center gap-2 text-tertiary text-sm
    ${isSelected ? "block-border-selected outline-offset-[3px]!" : ""}
  `}
    >
      <hr className="grow border-border-light" />
      <div className="flex items-center gap-1 shrink-0 font-bold">
        <LockTiny />
        Members-only content below
      </div>
      <hr className="grow border-border-light" />
    </div>
  );
};
