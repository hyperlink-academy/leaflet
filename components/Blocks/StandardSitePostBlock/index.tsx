import { BlockProps, BlockLayout } from "../Block";
import { useEntity } from "src/replicache";
import { useUIState } from "src/useUIState";
import { StandardSitePostItem } from "./StandardSitePostItem";

export const StandardSitePostBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let uri = useEntity(props.entityID, "block/standard-site-post")?.data.value;

  if (!uri) return null;

  return (
    <BlockLayout
      isSelected={!!isSelected}
      hasBackground="page"
      borderOnHover
      className="standardSitePostBlock sm:px-3! sm:py-2! px-2! py-1!"
    >
      <StandardSitePostItem uri={uri} />
    </BlockLayout>
  );
};
