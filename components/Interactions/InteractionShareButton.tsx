"use client";
import { useRef, useState } from "react";
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

export const InteractionShareButton = (props: {
  postUrl?: string;
  title?: string;
  type: "none" | "weak" | "strong";
  trigger?: React.ReactNode;
}) => {
  let smoker = useSmoker();
  let isMobile = useIsMobile();
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
      {isMobile ? (
        <MobileSheet open={shareModalOpen} onOpenChange={setShareModalOpen}>
          <ShareModalContent
            postUrl={props.postUrl}
            title={props.title}
            onPosted={() => setShareModalOpen(false)}
          />{" "}
        </MobileSheet>
      ) : (
        <Modal open={shareModalOpen} onOpenChange={setShareModalOpen}>
          <ShareModalContent
            postUrl={props.postUrl}
            title={props.title}
            onPosted={() => setShareModalOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

const ShareModalContent = (props: {
  postUrl?: string;
  title?: string;
  onPosted: () => void;
}) => {
  let { identity } = useIdentityData();
  let toaster = useToaster();
  let editorStateRef = useRef<EditorState | null>(null);
  let [charCount, setCharCount] = useState(0);
  let [posting, setPosting] = useState(false);

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
      toaster({ content: "Oh no! Something went wrong!", type: "error" });
      return;
    }
    toaster({ content: "Shared to Bluesky!", type: "success" });
    props.onPosted();
  };

  return (
    <div className="flex flex-col gap-3 w-full sm:w-96">
      <div className="font-bold text-secondary">Share on Bluesky</div>
      <BlueskyPostComposer
        profile={profile}
        editorStateRef={editorStateRef}
        charCount={charCount}
        onCharCountChange={setCharCount}
        embed={{ title: props.title, url: props.postUrl }}
      />
      <ButtonPrimary
        className="place-self-end"
        onClick={post}
        disabled={posting || charCount === 0 || charCount > 300}
      >
        {posting ? <DotLoader /> : "Post to Bluesky"}
      </ButtonPrimary>
    </div>
  );
};
