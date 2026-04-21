import { BlockProps, BlockLayout } from "./Block";
import { useUIState } from "src/useUIState";

export const MailboxBlock = (
  props: BlockProps & {
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  return (
    <BlockLayout
      isSelected={!!isSelected}
      hasBackground={"accent"}
      areYouSure={props.areYouSure}
      setAreYouSure={props.setAreYouSure}
      className="flex flex-col gap-1 items-center justify-center text-center"
    >
      <div className="font-bold text-secondary">
        Mailbox blocks are deprecated
      </div>
      <div className="text-tertiary text-sm">
        Email subscriptions have moved to publication newsletters.
      </div>
    </BlockLayout>
  );
};
