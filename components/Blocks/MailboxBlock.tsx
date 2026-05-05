import { BlockProps, BlockLayout } from "./Block";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import { focusPage } from "src/utils/focusPage";

export const MailboxBlock = (
  props: BlockProps & {
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let archive = useEntity(props.entityID, "mailbox/archive");
  let { rep } = useReplicache();
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
      {archive && (
        <button
          className="text-accent-contrast hover:underline text-sm mt-1"
          onMouseDown={(e) => {
            e.preventDefault();
            if (rep) {
              useUIState
                .getState()
                .openPage(props.parent, archive.data.value);
              focusPage(archive.data.value, rep);
            }
          }}
        >
          See past posts
        </button>
      )}
    </BlockLayout>
  );
};
