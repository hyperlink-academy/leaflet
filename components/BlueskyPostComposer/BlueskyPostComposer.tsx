"use client";
import { EditorState } from "prosemirror-state";
import { AppBskyFeedDefs } from "@atproto/api";
import { ProsemirrorEditor } from "./ProsemirrorEditor";
import { BskyEmbed } from "components/Blocks/BlueskyPostBlock/BskyEmbed";
import { Avatar } from "components/Avatar";
import { CharacterCounter } from "./CharacterCounter";

// The Bluesky compose card: the author's avatar/handle, the prosemirror post
// editor, a preview of the record attached to the post being shared, and a
// character counter (unless the caller shows it beside its own Post button). Shared by the publish flow's ShareOptions and the
// "Share on Bluesky" modal so both compose against the same UI.
export function BlueskyPostComposer(props: {
  profile: {
    avatar?: string | null;
    displayName?: string | null;
    handle?: string | null;
  };
  editorStateRef: React.RefObject<EditorState | null>;
  charCount: number;
  onCharCountChange: (count: number) => void;

  persistKey?: string;

  autoFocus?: boolean;
  hideCharacterCounter?: boolean;

  embed: AppBskyFeedDefs.PostView["embed"];
}) {
  return (
    <>
      <div className="bskyPostComposer flex flex-col">
        <div className="flex gap-3 ">
          <Avatar
            src={props.profile.avatar}
            displayName={props.profile.displayName}
            size="large"
          />

          <ProsemirrorEditor
            editorStateRef={props.editorStateRef}
            onCharCountChange={props.onCharCountChange}
            persistKey={props.persistKey}
            autoFocus={props.autoFocus}
          />
        </div>
        <div className="pt-4 pl-10 w-full">
          <div className="pointer-events-none">
            <BskyEmbed content={props.embed} />
          </div>
        </div>
        {!props.hideCharacterCounter && (
          <>
            <hr className="mt-4 mb-2 border-border-light -mx-3" />
            <div className="place-self-end">
              <CharacterCounter count={props.charCount} limit={300} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
