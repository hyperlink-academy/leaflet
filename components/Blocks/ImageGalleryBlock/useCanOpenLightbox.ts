import { useEntitySetContext } from "components/EntitySetProvider";
import { useUIState } from "src/useUIState";

// The press that selects a block has already selected it by the time its
// click arrives, so a click is judged by the selection its press began with.
let selectedAtPress: string[] = [];
if (typeof window !== "undefined")
  for (let type of ["pointerdown", "keydown"])
    window.addEventListener(
      type,
      () => {
        selectedAtPress = useUIState
          .getState()
          .selectedBlocks.map((b) => b.entityID);
      },
      true,
    );

// Writers select the block first; a second click on an image opens the
// lightbox. Readers (no write permission) open it on the first click.
// `canOpenLightbox` is whether the next click would open it, and
// `clickOpensLightbox` whether the click being handled does.
export function useCanOpenLightbox(args: {
  entityID: string;
  isSelected: boolean;
  preview?: boolean;
}) {
  let { write } = useEntitySetContext().permissions;
  let canOpenLightbox = !args.preview && (!write || args.isSelected);
  let clickOpensLightbox = () =>
    canOpenLightbox && (!write || selectedAtPress.includes(args.entityID));
  return { canOpenLightbox, clickOpensLightbox };
}
