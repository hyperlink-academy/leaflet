import { Separator, ShortcutKey } from "components/Layout";
import { metaKey } from "src/utils/metaKey";
import { LinkButton } from "./InlineLinkToolbar";
import { TextDecorationButton } from "./TextDecorationButton";
import { schema } from "components/Blocks/TextBlock/schema";
import { BoldSmall, ItalicSmall, StrikethroughSmall } from "./TextToolbar";
import { isMac } from "src/utils/isDevice";
import { ToolbarTypes } from ".";

export const FootnoteTextToolbar = (props: {
  setToolbarState: (s: ToolbarTypes) => void;
}) => {
  return (
    <>
      <TextDecorationButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Bold </div>
            <div className="flex gap-1">
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> B </ShortcutKey>
            </div>
          </div>
        }
        mark={schema.marks.strong}
        icon={<BoldSmall />}
      />

      <TextDecorationButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="italic font-normal text-center">Italic</div>
            <div className="flex gap-1">
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> I </ShortcutKey>
            </div>
          </div>
        }
        mark={schema.marks.em}
        icon={<ItalicSmall />}
      />
      <TextDecorationButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center font-normal line-through">
              Strikethrough
            </div>
            <div className="flex gap-1">
              {isMac() ? (
                <>
                  <ShortcutKey>⌘</ShortcutKey> +{" "}
                  <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                  <ShortcutKey> X </ShortcutKey>
                </>
              ) : (
                <>
                  <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                  <ShortcutKey> Meta </ShortcutKey> +{" "}
                  <ShortcutKey> X </ShortcutKey>
                </>
              )}
            </div>
          </div>
        }
        mark={schema.marks.strikethrough}
        icon={<StrikethroughSmall />}
      />
      <Separator classname="h-6!" />
      <LinkButton setToolbarState={props.setToolbarState} />
    </>
  );
};
