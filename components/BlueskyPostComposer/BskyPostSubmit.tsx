"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AtUri } from "@atproto/syntax";
import type { AppBskyRichtextFacet } from "@atproto/api";
import type { EditorState } from "prosemirror-state";
import type { PublishBskyResult } from "actions/publishBskyPost";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { useToaster } from "components/Toast";
import { actionErrorContent } from "components/OAuthError";

// Loaded on demand rather than bundled: the composer drags in prosemirror,
// which every reader would otherwise download for a button most never click.
export const LazyBlueskyPostComposer = dynamic(
  () => import("./BlueskyPostComposer").then((m) => m.BlueskyPostComposer),
  { ssr: false, loading: () => <DotLoader /> },
);

// Editor state and submit flow shared by every "post to Bluesky" form. `post`
// serializes the composed text and hands it to `publish`, which calls the
// relevant server action; success and failure are toasted here.
export function useBskyPostSubmit(args: { onPosted: () => void }) {
  let toaster = useToaster();
  let editorStateRef = useRef<EditorState | null>(null);
  let [charCount, setCharCount] = useState(0);
  let [posting, setPosting] = useState(false);

  let post = async (
    publish: (
      text: string,
      facets: AppBskyRichtextFacet.Main[],
    ) => Promise<PublishBskyResult>,
  ) => {
    if (!editorStateRef.current || posting) return;
    setPosting(true);
    // Runtime import keeps the prosemirror module graph out of the static
    // bundle; by submit time the composer chunk (same module) is loaded.
    let { editorStateToFacetedText } = await import("./ProsemirrorEditor");
    let [text, facets] = editorStateToFacetedText(editorStateRef.current);
    let res = await publish(text, facets);
    setPosting(false);
    if (!res.success) {
      toaster({
        content: actionErrorContent(
          res.error,
          "Hmm… Something went wrong. Try again!",
        ),
        type: "error",
      });
      return;
    }
    toaster({ content: sharedToBskyToast(res.uri), type: "success" });
    args.onPosted();
  };

  return { editorStateRef, charCount, setCharCount, posting, post };
}

export function BskyPostSubmitButton(props: {
  posting: boolean;
  charCount: number;
  onClick: () => void;
}) {
  return (
    <ButtonPrimary
      className="place-self-end"
      compact
      onClick={props.onClick}
      disabled={props.posting || props.charCount === 0 || props.charCount > 300}
    >
      {props.posting ? (
        <DotLoader />
      ) : (
        <>
          <BlueskyTiny /> Post
        </>
      )}
    </ButtonPrimary>
  );
}

function sharedToBskyToast(postAtUriString: string) {
  let postAtUri = new AtUri(postAtUriString);
  let postUrl = `https://bsky.app/profile/${postAtUri.host}/post/${postAtUri.rkey}`;
  return (
    <span>
      Shared to Bluesky!{" "}
      <a
        href={postUrl}
        target="_blank"
        rel="noreferrer"
        className="underline text-accent-2!"
      >
        View it here.
      </a>
    </span>
  );
}
