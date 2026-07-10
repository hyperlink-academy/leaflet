"use client";
import { EditorState } from "prosemirror-state";
import { AppBskyFeedDefs } from "@atproto/api";
import { ProsemirrorEditor } from "./ProsemirrorEditor";
import { BskyEmbed } from "components/Blocks/BlueskyPostBlock/BskyEmbed";
import { Avatar } from "components/Avatar";

// The Bluesky compose card: the author's avatar/handle, the prosemirror post
// editor, a preview of the record attached to the post being shared, and a
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
  // The embed preview of the record attached to the post being shared.
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
          />
        </div>
        <div className="pt-4 pl-10 w-full">
          <div className="pointer-events-none">
            <BskyEmbed content={props.embed} />
          </div>
        </div>
        <hr className="mt-4 mb-2 border-border-light -mx-3" />
        <div className="place-self-end">
          <CharacterCounter count={props.charCount} limit={300} />
        </div>
      </div>
    </>
  );
}

function CharacterCounter(props: { count: number; limit: number }) {
  const remaining = props.limit - props.count;
  const over = props.count - props.limit;
  const isOver = over > 0;

  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(props.count / props.limit, 1);

  return (
    <div
      className={`flex items-center gap-1 text-xs italic ${
        isOver ? "text-accent-contrast font-bold" : "text-tertiary"
      }`}
    >
      <span>{isOver ? over : remaining}</span>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className={`text-accent-contrast ${isOver ? "" : ""}`}
      >
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-20"
        />
        {isOver ? (
          <text
            x="12"
            y="11.5"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontWeight="bold"
            fill="currentColor"
          >
            !
          </text>
        ) : (
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 12 12)"
          />
        )}
      </svg>
    </div>
  );
}
