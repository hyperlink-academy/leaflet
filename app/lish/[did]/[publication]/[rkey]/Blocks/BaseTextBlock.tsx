import { ProfilePopover } from "components/ProfilePopover";
import {
  TextBlockCore,
  TextBlockCoreProps,
  RichText,
} from "../Blocks/TextBlockCore";
import { ReactNode } from "react";
import { PublishedFootnoteRefRenderer } from "../Footnotes/PublishedFootnotePopover";

// Re-export RichText for backwards compatibility
export { RichText };

function DidMentionWithPopover(props: { did: string; children: ReactNode }) {
  return <ProfilePopover didOrHandle={props.did} trigger={props.children} />;
}

export function BaseTextBlock(props: Omit<TextBlockCoreProps, "renderers">) {
  return (
    <TextBlockCore
      {...props}
      renderers={{
        DidMention: DidMentionWithPopover,
        FootnoteRef: PublishedFootnoteRefRenderer,
      }}
      footnoteIndexMap={props.footnoteIndexMap}
    />
  );
}
