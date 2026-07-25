import { Separator } from "components/Layout";
import { LinkButton } from "./InlineLinkToolbar";
import { TextMarkButtons } from "./TextToolbar";
export const FootnoteTextToolbar = (props: {
  setToolbarState: (s: "default" | "link") => void;
}) => {
  return (
    <>
      <TextMarkButtons />
      <Separator classname="h-6!" />
      <LinkButton setToolbarState={props.setToolbarState} />
    </>
  );
};
