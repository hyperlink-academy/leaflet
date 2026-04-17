"use client";
import { Checkbox } from "components/Checkbox";
import { BlueskyPostEditorProsemirror } from "./BskyPostEditorProsemirror";
import { EditorState } from "prosemirror-state";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import type { NormalizedPublication } from "src/utils/normalizeRecords";

export type ShareState = {
  bluesky: boolean;
  postToReaders: boolean;
  email: boolean;
  quiet: boolean;
};

type Props = {
  shareState: ShareState;
  setShareState: (state: ShareState) => void;
  charCount: number;
  setCharCount: (c: number) => void;
  editorStateRef: React.MutableRefObject<EditorState | null>;
  title: string;
  profile: ProfileViewDetailed;
  description: string;
  record?: NormalizedPublication | null;
  subscriberCount?: number;
};

export function ShareOptions(props: Props) {
  const { shareState, setShareState } = props;
  const handleChange = (
    key: keyof Omit<ShareState, "quiet">,
    checked: boolean,
  ) => {
    setShareState({ ...shareState, [key]: checked, quiet: false });
  };

  const handleQuietChange = (checked: boolean) => {
    if (checked) {
      setShareState({
        bluesky: false,
        postToReaders: false,
        email: false,
        quiet: true,
      });
    } else {
      setShareState({ ...shareState, quiet: false });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Checkbox
        className="gap-4!"
        checked={shareState.email}
        onChange={(e) => handleChange("email", e.target.checked)}
      >
        <div className="flex flex-col">
          <div>
            Email{" "}
            {props.subscriberCount !== undefined
              ? `${props.subscriberCount} `
              : ""}
            Subscribers
          </div>
        </div>
      </Checkbox>

      <Checkbox
        className="gap-4!"
        checked={shareState.postToReaders}
        onChange={(e) => handleChange("postToReaders", e.target.checked)}
      >
        <div className="flex flex-col">
          <div>Post to Readers</div>
          <div className="text-sm text-tertiary font-normal">
            This post will show up in Leaflet feeds and other Standard Site
            enabled reader feeds
          </div>
        </div>
      </Checkbox>

      <Checkbox
        className="gap-4!"
        checked={shareState.bluesky}
        onChange={(e) => handleChange("bluesky", e.target.checked)}
      >
        <div className="flex flex-col">
          <div>Share on Bluesky</div>
          <div className="text-sm text-tertiary font-normal">
            Pub subscribers will be updated via a custom Bluesky feed
          </div>
        </div>
      </Checkbox>
      <div
        className={`w-full pl-7 pb-2 ${!shareState.bluesky ? "opacity-50" : ""}`}
      >
        <div className="opaque-container border-border! py-2 px-3 text-sm rounded-lg!">
          <div className="flex gap-2">
            <img
              className="rounded-full w-6 h-6 sm:w-[42px] sm:h-[42px] shrink-0"
              src={props.profile.avatar}
            />
            <div className="flex flex-col min-w-0 w-full">
              <div className="flex gap-2">
                <p className="font-bold">{props.profile.displayName}</p>
                <p className="text-tertiary">@{props.profile.handle}</p>
              </div>
              <div className="flex flex-col">
                <BlueskyPostEditorProsemirror
                  editorStateRef={props.editorStateRef}
                  onCharCountChange={props.setCharCount}
                />
              </div>
              <div className="opaque-container text-secondary overflow-hidden flex flex-col mt-4 w-full">
                <div className="flex flex-col p-2">
                  <div className="font-bold truncate min-w-0 w-full ">
                    {props.title}
                  </div>
                  <div className="text-tertiary line-clamp-3">
                    {props.description}
                  </div>
                  <hr className="border-border mt-2 mb-1" />
                  <p className="text-xs text-tertiary">
                    {props.record?.url?.replace(/^https?:\/\//, "")}
                  </p>
                </div>
              </div>
              <div className="text-xs text-secondary italic place-self-end pt-2">
                {props.charCount}/300
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border-light my-1" />

      <Checkbox
        className="gap-4!"
        checked={shareState.quiet}
        onChange={(e) => handleQuietChange(e.target.checked)}
      >
        <div className="flex flex-col">
          <div>Post Quietly</div>
          <div className="text-sm text-tertiary font-normal">
            No one will be notified about this post
          </div>
        </div>
      </Checkbox>
    </div>
  );
}
