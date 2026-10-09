"use client";
import { useState } from "react";
import { AtUri } from "@atproto/syntax";
import { useSmoker } from "../Toast";
import { Menu, MenuItem } from "../Menu";
import { Modal } from "../Modal";
import { ShareTiny } from "../Icons/ShareTiny";
import { useIdentityData } from "../IdentityProvider";
import { publishPostToBsky } from "actions/publishBskyPost";
import { viewerPostLangs } from "src/utils/bskyPostLangs";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { bskyPostEmbed } from "src/utils/bskyPostEmbed";
import { LoginContent } from "components/LoginButton";
import { usePrefetchedScreenshot } from "components/BlueskyPostComposer/usePrefetchedScreenshot";
import {
  BskyPostSubmitButton,
  LazyBlueskyPostComposer,
  useBskyPostSubmit,
} from "components/BlueskyPostComposer/BskyPostSubmit";
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
  trigger?: React.ReactNode;
  className?: string;
}) => {
  let smoker = useSmoker();
  let [shareModalOpen, setShareModalOpen] = useState(false);

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
            className={`text-sm flex shrink-0 gap-1 items-center relative font-bold ${props.className}`}
          >
            {props.trigger ? (
              props.trigger
            ) : (
              <ShareTiny role="img" aria-label="Share" />
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
  let { editorStateRef, charCount, setCharCount, posting, post } =
    useBskyPostSubmit({ onPosted: props.onPosted });

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

  // The card image is a page screenshot when this is a quote share (the quote
  // highlight matters more than the cover) or when the document has no cover
  // image to fall back on.
  let useScreenshot = !!props.preferUrlScreenshot || !coverImage;
  let screenshot = usePrefetchedScreenshot(
    props.postUrl,
    useScreenshot && props.shareModalOpen,
  );

  let share = () => {
    let url = props.postUrl;
    if (!url) return;
    post(async (text, facets) => {
      // Block on the prefetched screenshot (kicked off when the modal opened)
      // so the post's card ships with it. If the prefetch failed,
      // preferUrlScreenshot has the server take its own screenshot instead.
      let prefetchedThumb = screenshot.promiseRef.current
        ? (await screenshot.promiseRef.current) ?? undefined
        : undefined;
      return publishPostToBsky({
        text,
        facets,
        url,
        document_record: props.docRecord,
        documentUri: props.documentUri,
        publicationUri: props.pubUri,
        preferUrlScreenshot: useScreenshot,
        prefetchedThumb,
        langs: viewerPostLangs(),
      });
    });
  };

  // The #view embed wants a resolvable thumbnail URL, not the raw blob ref, so
  // point at the atproto image proxy for the cover blob in the author's PDS.
  let coverThumb =
    coverImage && authorDid
      ? blobRefToSrc(coverImage.ref, authorDid, undefined, {
          width: 1200,
        })
      : undefined;

  let embed = bskyPostEmbed({
    url: props.postUrl ?? "",
    title,
    description,
    thumb: useScreenshot ? screenshot.previewSrc ?? undefined : coverThumb,
    thumbPending: useScreenshot && !screenshot.previewSrc,
    publishedAt,
    publication: props.publication,
    pubOwnerDid: props.pubOwnerDid,
  });

  let submitButton = (
    <BskyPostSubmitButton
      posting={posting}
      charCount={charCount}
      onClick={share}
    />
  );

  let loggedIn = identity && identity.atp_did;

  let shareContent = !loggedIn ? (
    <LoginContent
      redirectRoute={typeof window !== "undefined" ? window.location.href : ""}
      className="sm:w-full!"
    />
  ) : (
    <LazyBlueskyPostComposer
      profile={profile}
      editorStateRef={editorStateRef}
      charCount={charCount}
      onCharCountChange={setCharCount}
      embed={embed}
      autoFocus
      hideCharacterCounter
    />
  );

  return (
    <>
      <Modal
        sheetOnMobile
        open={props.shareModalOpen}
        onOpenChange={props.setShareModalOpen}
        title={loggedIn ? "Share on Bluesky" : undefined}
        actionButton={loggedIn ? submitButton : undefined}
        className="max-w-full w-lg"
      >
        {/* sm: aligns with the useIsMobile breakpoint — the sheet's own header
            spacing already covers this gap. */}
        {loggedIn && <div className="spacer w-full h-2 hidden sm:block" />}
        {shareContent}
      </Modal>
    </>
  );
};
