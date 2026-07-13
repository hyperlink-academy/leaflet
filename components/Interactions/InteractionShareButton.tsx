"use client";
import { useRef, useState } from "react";
import { AtUri } from "@atproto/syntax";
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
import { publishPostToBsky } from "app/(app)/[leaflet_id]/publish/publishBskyPost";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { bskyPostEmbed } from "src/utils/bskyPostEmbed";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { LoginContent } from "components/LoginButton";
import {
  NormalizedDocument,
  NormalizedPublication,
} from "lexicons/src/normalize";

export const InteractionShareButton = (props: {
  postRecord: NormalizedDocument;
  postUrl?: string;
  documentUri?: string;
  publication?: NormalizedPublication;
  pubUri: string | undefined;
  type: "none" | "weak" | "strong";
  trigger?: React.ReactNode;
}) => {
  let { identity } = useIdentityData();

  // FLAG FOR CELINE ONLY
  if (identity?.atp_did !== "did:plc:kydzcmnywraao2srchqgwj5c") {
    return null;
  }
  let smoker = useSmoker();
  let [shareModalOpen, setShareModalOpen] = useState(false);

  if (props.type === "none") return;

  function postOwnerDid(uri: string): string | null {
    try {
      return new AtUri(uri).host;
    } catch {
      return null;
    }
  }

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
        docRecord={props.postRecord}
        documentUri={props.documentUri}
        publication={props.publication}
        pubOwnerDid={
          (props.documentUri ? postOwnerDid(props.documentUri) : undefined) ||
          undefined
        }
        pubUri={props.pubUri}
        onPosted={() => setShareModalOpen(false)}
        shareModalOpen={shareModalOpen}
        setShareModalOpen={setShareModalOpen}
      />
    </>
  );
};

export const BskyShareModal = (props: {
  postUrl?: string;
  docRecord: NormalizedDocument;
  documentUri?: string;
  pubOwnerDid: string | undefined;
  publication?: NormalizedPublication;
  pubUri: string | undefined;
  preferUrlScreenshot?: boolean;
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

  let { title, description, coverImage, publishedAt } = props.docRecord;
  // The cover blob lives in the repo hosting the document, i.e. the document
  // uri's host.
  let authorDid = props.documentUri
    ? new AtUri(props.documentUri).host
    : undefined;

  let post = async () => {
    if (!editorStateRef.current || !props.postUrl || posting) return;
    setPosting(true);
    let [text, facets] = editorStateToFacetedText(editorStateRef.current);
    let res = await publishPostToBsky({
      text,
      facets,
      url: props.postUrl,
      document_record: props.docRecord,
      documentUri: props.documentUri,
      publicationUri: props.pubUri,
      preferUrlScreenshot: props.preferUrlScreenshot,
    });
    setPosting(false);
    if (!res.success) {
      toaster({
        content: "Hmm… Something went wrong. Try again!",
        type: "error",
      });
      return;
    }
    let postAtUri = new AtUri(res.uri);
    let postUrl = `https://bsky.app/profile/${postAtUri.host}/post/${postAtUri.rkey}`;
    toaster({
      content: (
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
      ),
      type: "success",
    });
    props.onPosted();
  };

  // The #view embed wants a resolvable thumbnail URL, not the raw blob ref, so
  // point at the atproto image proxy for the cover blob in the author's PDS.
  let thumb =
    coverImage && authorDid
      ? blobRefToSrc(coverImage.ref, authorDid, undefined, {
          width: 1000,
        })
      : undefined;

  let embed = bskyPostEmbed({
    url: props.postUrl ?? "",
    title,
    description,
    thumb,
    publishedAt,
    publication: props.publication,
    pubOwnerDid: props.pubOwnerDid,
  });

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
    <>
      <BlueskyPostComposer
        profile={profile}
        editorStateRef={editorStateRef}
        charCount={charCount}
        onCharCountChange={setCharCount}
        embed={embed}
      />
    </>
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
