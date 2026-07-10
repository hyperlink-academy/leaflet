"use client";
import { EditorState } from "prosemirror-state";
import { ProsemirrorEditor } from "./ProsemirrorEditor";

// The Bluesky compose card: the author's avatar/handle, the prosemirror post
// editor, a preview of the external link card for the post being shared, and a
// character counter. Shared by the publish flow's ShareOptions and the
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
  // localStorage key under which the in-progress post is persisted
  persistKey?: string;
  // The external link-card preview of the post being shared.
  embed: { title?: string; description?: string; url?: string };
}) {
  return (
    <div className="opaque-container border-border! py-2 px-3 text-sm rounded-lg!">
      <div className="flex gap-2">
        <img
          className="rounded-full w-6 h-6 sm:w-[42px] sm:h-[42px] shrink-0"
          src={props.profile.avatar ?? undefined}
        />
        <div className="flex flex-col min-w-0 w-full">
          <div className="flex gap-2">
            <p className="font-bold">{props.profile.displayName}</p>
            <p className="text-tertiary">@{props.profile.handle}</p>
          </div>
          <div className="flex flex-col">
            <ProsemirrorEditor
              editorStateRef={props.editorStateRef}
              onCharCountChange={props.onCharCountChange}
              persistKey={props.persistKey}
            />
          </div>
          <div className="opaque-container text-secondary overflow-hidden flex flex-col mt-4 w-full">
            <div className="flex flex-col p-2">
              <div className="font-bold truncate min-w-0 w-full ">
                {props.embed.title}
              </div>
              <div className="text-tertiary line-clamp-3">
                {props.embed.description}
              </div>
              <hr className="border-border mt-2 mb-1" />
              <p className="text-xs text-tertiary">
                {props.embed.url?.replace(/^https?:\/\//, "")}
              </p>
            </div>
          </div>
          <div className="text-xs text-secondary italic place-self-end pt-2">
            {props.charCount}/300
          </div>
        </div>
      </div>
    </div>
  );
}
