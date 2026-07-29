import { Separator } from "components/Layout";
import { LinkButton } from "./InlineLinkToolbar";
import { TextMarkButtons } from "./TextToolbar";
import { HighlightButton } from "./HighlightToolbar";
export const FootnoteTextToolbar = (props: {
  setToolbarState: (s: "default" | "link" | "highlight") => void;
}) => {
  return (
    <>
      <TextMarkButtons />
      <HighlightButton setToolbarState={props.setToolbarState} />
      <Separator classname="h-6!" />
      <LinkButton setToolbarState={props.setToolbarState} />
    </>
  );
};
