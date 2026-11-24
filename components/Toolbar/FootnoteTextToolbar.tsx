import { Separator } from "components/Layout";
import { LinkButton } from "./InlineLinkToolbar";
import { TextMarkButtons } from "./TextToolbar";
import { HighlightButton } from "./HighlightToolbar";
import { TextDecorationButton } from "./TextDecorationButton";
import { schema } from "components/Blocks/TextBlock/schema";
import { BlockCodeSmall } from "components/Icons/BlockCodeSmall";
export const FootnoteTextToolbar = (props: {
  setToolbarState: (s: "default" | "link" | "highlight") => void;
  tableCell?: boolean;
}) => {
  return (
    <>
      <TextMarkButtons />
      {props.tableCell && (
        <>
          <TextDecorationButton
            mark={schema.marks.underline}
            tooltipContent="Underline"
            icon={
              <span className="font-semibold underline" aria-label="Underline">
                U
              </span>
            }
          />
          <TextDecorationButton
            mark={schema.marks.code}
            tooltipContent="Inline code"
            icon={<BlockCodeSmall aria-label="Inline code" />}
          />
        </>
      )}
      <HighlightButton setToolbarState={props.setToolbarState} />
      <Separator classname="h-6!" />
      <LinkButton setToolbarState={props.setToolbarState} />
    </>
  );
};
