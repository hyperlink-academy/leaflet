"use client";
import { Checkbox } from "components/Checkbox";
import { BlueskyPostEditorProsemirror } from "./BskyPostEditorProsemirror";
import { EditorState } from "prosemirror-state";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { useState } from "react";
import { sendPostPreview } from "actions/publications/sendPostPreview";
import { ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";

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
  newsletter_enabled?: boolean;
  publication_uri?: string;
  root_entity: string;
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
      {props.newsletter_enabled ? (
        <>
          <Checkbox
            className="gap-4!"
            checked={shareState.email}
            onChange={(e) => handleChange("email", e.target.checked)}
          >
            <div className="flex flex-col">
              <div>
                Email{" "}
                {props.subscriberCount !== undefined
                  ? `${props.subscriberCount.toLocaleString()} `
                  : ""}
                {props.subscriberCount === 1 ? "Subscriber" : "Subscribers"}
              </div>
            </div>
          </Checkbox>
          {props.publication_uri ? (
            <EmailPreview
              publication_uri={props.publication_uri}
              root_entity={props.root_entity}
              title={props.title}
              description={props.description}
            />
          ) : null}
        </>
      ) : null}

      <Checkbox
        className="gap-4!"
        checked={shareState.postToReaders}
        onChange={(e) => handleChange("postToReaders", e.target.checked)}
      >
        <div className="flex flex-col">
          <div>Show in Discover</div>
          <div className="text-sm text-tertiary font-normal">
            Show this post in Leaflet's Discover feed and other standard.site
            reader feeds
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
            Subscribers will be updated via a custom Bluesky feed
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

function EmailPreview(props: {
  publication_uri: string;
  root_entity: string;
  title: string;
  description: string;
}) {
  let [email, setEmail] = useState("");
  let [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "sending" }
    | { state: "sent" }
    | { state: "error"; message: string }
  >({ state: "idle" });

  const errorCopy = (code: string) => {
    switch (code) {
      case "unauthorized":
        return "You don't have permission to send a preview for this publication.";
      case "invalid_email":
        return "That email address doesn't look right.";
      case "newsletter_not_enabled":
        return "Newsletter mode isn't enabled for this publication.";
      case "render_failed":
        return "Couldn't render the email. Try again?";
      case "email_send_failed":
        return "Postmark rejected the send. Try again later.";
      default:
        return "Something went wrong sending the preview.";
    }
  };

  const submit = async () => {
    if (!email) return;
    setStatus({ state: "sending" });
    const res = await sendPostPreview({
      publication_uri: props.publication_uri,
      root_entity: props.root_entity,
      title: props.title,
      description: props.description,
      to: email,
    });
    if (res.ok) {
      setStatus({ state: "sent" });
    } else {
      setStatus({ state: "error", message: errorCopy(res.error) });
    }
  };

  return (
    <div className="pl-7 pb-2 flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status.state !== "idle") setStatus({ state: "idle" });
          }}
          className="grow input-with-border px-2 py-1 text-sm rounded-md"
        />
        <ButtonSecondary
          type="button"
          onClick={submit}
          disabled={!email || status.state === "sending"}
          className="h-[30px]"
        >
          {status.state === "sending" ? (
            <DotLoader className="h-[23px]" />
          ) : (
            "Send preview"
          )}
        </ButtonSecondary>
      </div>
      {status.state === "sent" ? (
        <div className="text-sm text-tertiary italic">
          Preview sent to {email}.
        </div>
      ) : status.state === "error" ? (
        <div className="text-sm text-accent-contrast">{status.message}</div>
      ) : (
        <div className="text-sm text-tertiary font-normal">
          Send the rendered email to a test address before broadcasting.
        </div>
      )}
    </div>
  );
}
