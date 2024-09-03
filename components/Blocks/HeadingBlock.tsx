import { useEntity } from "src/replicache";

import { BlockProps } from "./Block";
import { TextBlock } from "./TextBlock/index";

const HeadingStyle = {
  1: "text-xl font-bold",
  2: "text-lg font-bold",
  3: "text-base font-bold text-secondary ",
} as { [level: number]: string };

export function HeadingBlock(props: BlockProps & { preview?: boolean }) {
  let headingLevel = useEntity(props.entityID, "block/heading-level");

  return (
    <TextBlock
      {...props}
      preview={props.preview}
      className={HeadingStyle[headingLevel?.data.value || 1]}
    />
  );
}
