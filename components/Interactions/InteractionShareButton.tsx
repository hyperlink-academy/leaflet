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
import {
  bskyPostEmbed,
  SharePublication,
  ShareAuthor,
} from "src/utils/bskyPostEmbed";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { LoginContent } from "components/LoginButton";
import { NormalizedDocument } from "lexicons/src/normalize";

export const InteractionShareButton = (props: {
  postRecord: NormalizedDocument;
  postUrl?: string;
  documentUri?: string;
  publication?: SharePublication;
  author?: ShareAuthor;
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
        docRecord={props.postRecord}
        documentUri={props.documentUri}
        publication={props.publication}
        author={props.author}
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
  // The at-uri of the document being shared. Combined with the publication uri,
  // it lets the posted card carry the standard.site strong refs (so it renders
  // as a publication card, not a bare link). Its host is the author's did — the
  // repo holding the doc and its cover blob.
  documentUri?: string;
  // When the shared post belongs to a publication, this enriches the preview
  // into the standard.site card (publication footer) instead of a generic link.
  publication?: SharePublication;
  // The post author, shown as the byline in the preview card.
  author?: ShareAuthor;
  // Prefer a screenshot of `postUrl` as the card thumbnail over the doc's cover
  // image. Set for quote shares so the card shows the quoted passage.
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
      publicationUri: props.publication?.uri,
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
    toaster({ content: "Shared to Bluesky!", type: "success" });
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
    author: props.author ?? (authorDid ? { did: authorDid } : undefined),
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
      {props.postUrl}
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
