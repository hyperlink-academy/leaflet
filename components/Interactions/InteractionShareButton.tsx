"use client";
import { useRef, useState } from "react";
import { AppBskyFeedDefs } from "@atproto/api";
import { EditorState } from "prosemirror-state";
import { useSmoker, useToaster } from "../Toast";
import { Menu, MenuItem } from "../Menu";
import { ButtonPrimary } from "../Buttons";
import { Modal } from "../Modal";
import { MobileSheet } from "../MobileSheet";
import { useIsMobile } from "src/hooks/isMobile";
import { ShareTiny } from "../Icons/ShareTiny";
import { BlueskyPostComposer } from "../BlueskyPostComposer/BlueskyPostComposer";
import { DotLoader } from "../utils/DotLoader";
import { useIdentityData } from "../IdentityProvider";
import { editorStateToFacetedText } from "../BlueskyPostComposer/ProsemirrorEditor";
import { sharePostToBsky } from "actions/sharePostToBsky";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { LoginContent } from "components/LoginButton";

export const InteractionShareButton = (props: {
  postUrl?: string;
  title?: string;
  type: "none" | "weak" | "strong";
  trigger?: React.ReactNode;
}) => {
  let { identity } = useIdentityData();
  console.log(identity?.atp_did);
  if (identity?.atp_did !== "did:plc:kydzcmnywraao2srchqgwj5c") {
    return null;
  }
  let smoker = useSmoker();
  let [shareModalOpen, setShareModalOpen] = useState(false);

  if (props.type === "none") return;

  return (
    <>
      <Menu
        trigger={
          <div
            className={`text-sm flex shrink-0 gap-1 items-center relative font-bold ${props.type === "strong" ? "text-accent-contrast" : ""}`}
          >
            {props.trigger ? (
              props.trigger
            ) : (
              <>
                <ShareTiny />
                Share
              </>
            )}
          </div>
        }
      >
        <MenuItem onSelect={() => setShareModalOpen(true)}>
          Share on Bluesky
        </MenuItem>

        <MenuItem
          onSelect={(e: Event) => {
            e.stopPropagation();
            e.preventDefault();

            if (!props.postUrl) return;
            navigator.clipboard.writeText(props.postUrl);

            let rect = (e.target as HTMLElement).getBoundingClientRect();
            smoker({
              text: <strong>Copied Link!</strong>,
              position: {
                y: rect.top,
                x: rect.left,
              },
            });
          }}
        >
          Copy Link
        </MenuItem>
      </Menu>
      <BskyShareModal
        postUrl={props.postUrl}
        title={props.title}
        onPosted={() => setShareModalOpen(false)}
        shareModalOpen={shareModalOpen}
        setShareModalOpen={setShareModalOpen}
      />
    </>
  );
};

export const BskyShareModal = (props: {
  postUrl?: string;
  title?: string;
  onPosted: () => void;
  shareModalOpen: boolean;
  setShareModalOpen: (s: boolean) => void;
}) => {
  let { identity } = useIdentityData();
  let toaster = useToaster();
  let editorStateRef = useRef<EditorState | null>(null);
  let [charCount, setCharCount] = useState(0);
  let [posting, setPosting] = useState(false);
  let isMobile = useIsMobile();

  let profile = {
    avatar: identity?.bsky_profiles?.record.avatar,
    displayName: identity?.bsky_profiles?.record.displayName,
    handle: identity?.bsky_profiles?.record.handle,
  };

  let post = async () => {
    if (!editorStateRef.current || !props.postUrl || posting) return;
    setPosting(true);
    let [text, facets] = editorStateToFacetedText(editorStateRef.current);
    let res = await sharePostToBsky({
      text,
      facets,
      url: props.postUrl,
      title: props.title ?? "",
      description: "",
    });
    setPosting(false);
    if (!res.success) {
      toaster({
        content: "Hmm… Something went wrong. Try again!",
        type: "error",
      });
      return;
    }
    toaster({ content: "Shared to Bluesky!", type: "success" });
    props.onPosted();
  };

  let embed: AppBskyFeedDefs.PostView["embed"] = {
    $type: "app.bsky.embed.external#view",
    external: {
      uri: props.postUrl ?? "",
      title: props.title ?? "",
      description: "",
    },
  };

  let submitButton = (
    <ButtonPrimary
      className="place-self-end"
      compact
      onClick={post}
      disabled={posting || charCount === 0 || charCount > 300}
    >
      {posting ? (
        <DotLoader />
      ) : (
        <>
          <BlueskyTiny /> Post
        </>
      )}
    </ButtonPrimary>
  );

  let loggedIn = identity && identity.atp_did;

  let shareContent = !loggedIn ? (
    <LoginContent redirectRoute={window.location.href} className="sm:w-full!" />
  ) : (
    <BlueskyPostComposer
      profile={profile}
      editorStateRef={editorStateRef}
      charCount={charCount}
      onCharCountChange={setCharCount}
      embed={embed}
    />
  );

  return (
    <>
      {isMobile ? (
        <MobileSheet
          open={props.shareModalOpen}
          onOpenChange={props.setShareModalOpen}
          title={loggedIn ? "Share on Bluesky" : undefined}
          actionButton={loggedIn ? submitButton : undefined}
        >
          {shareContent}
        </MobileSheet>
      ) : (
        <Modal
          open={props.shareModalOpen}
          onOpenChange={props.setShareModalOpen}
          title={loggedIn ? "Share on Bluesky" : undefined}
          actionButton={loggedIn ? submitButton : undefined}
          className="max-w-full w-lg"
        >
          {loggedIn && <div className="spacer w-full h-2" />}
          {shareContent}
        </Modal>
      )}
    </>
  );
};
