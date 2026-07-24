"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AtUri } from "@atproto/syntax";
import type { EditorState } from "prosemirror-state";
import { useSmoker, useToaster } from "../Toast";
import { Menu, MenuItem } from "../Menu";
import { ButtonPrimary } from "../Buttons";
import { Modal } from "../Modal";
import { MobileSheet } from "../MobileSheet";
import { useIsMobile } from "src/hooks/isMobile";
import { ShareTiny } from "../Icons/ShareTiny";
import { DotLoader } from "../utils/DotLoader";
import { useIdentityData } from "../IdentityProvider";
import { publishPostToBsky } from "app/(app)/[leaflet_id]/publish/publishBskyPost";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { bskyPostEmbed } from "src/utils/bskyPostEmbed";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { LoginContent } from "components/LoginButton";
import {
  NormalizedDocument,
  NormalizedPublication,
} from "lexicons/src/normalize";

// Loaded on share-modal open rather than bundled: the composer drags in
// prosemirror, which every anonymous reader of a public post would otherwise
// download for a button most never click.
const BlueskyPostComposer = dynamic(
  () =>
    import("../BlueskyPostComposer/BlueskyPostComposer").then(
      (m) => m.BlueskyPostComposer,
    ),
  { ssr: false, loading: () => <DotLoader /> },
);

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

  // The card image is a page screenshot when this is a quote share (the quote
  // highlight matters more than the cover) or when the document has no cover
  // image to fall back on.
  let useScreenshot = !!props.preferUrlScreenshot || !coverImage;
  let screenshot = usePrefetchedScreenshot(
    props.postUrl,
    useScreenshot && props.shareModalOpen,
  );

  let post = async () => {
    if (!editorStateRef.current || !props.postUrl || posting) return;
    setPosting(true);
    // Block on the prefetched screenshot (kicked off when the modal opened) so
    // the post's card ships with it. If the prefetch failed,
    // preferUrlScreenshot has the server take its own screenshot instead.
    let prefetchedThumb = screenshot.promiseRef.current
      ? ((await screenshot.promiseRef.current) ?? undefined)
      : undefined;
    // Runtime import keeps the prosemirror module graph out of the static
    // bundle; by submit time the composer chunk (same module) is loaded.
    let { editorStateToFacetedText } = await import(
      "../BlueskyPostComposer/ProsemirrorEditor"
    );
    let [text, facets] = editorStateToFacetedText(editorStateRef.current);
    let res = await publishPostToBsky({
      text,
      facets,
      url: props.postUrl,
      document_record: props.docRecord,
      documentUri: props.documentUri,
      publicationUri: props.pubUri,
      preferUrlScreenshot: useScreenshot,
      prefetchedThumb,
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
    thumb: useScreenshot ? (screenshot.previewSrc ?? undefined) : coverThumb,
    thumbPending: useScreenshot && !screenshot.previewSrc,
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
    <LoginContent
      redirectRoute={typeof window !== "undefined" ? window.location.href : ""}
      className="sm:w-full!"
    />
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

// Kicks off the card screenshot (a slow browser render) the moment the share
// modal opens (`enabled`), so it's ready by the time the user finishes
// composing. `promiseRef` resolves to the base64 webp handed to
// publishPostToBsky (null on failure); `previewSrc` is an object URL for the
// compose card preview once the image lands.
function usePrefetchedScreenshot(url: string | undefined, enabled: boolean) {
  let promiseRef = useRef<Promise<string | null> | null>(null);
  let [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !url) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    promiseRef.current = fetch(
      `/api/quote_screenshot?url=${encodeURIComponent(url)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        let blob = await res.blob();
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setPreviewSrc(objectUrl);
        }
        return blobToBase64(blob);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
      promiseRef.current = null;
      setPreviewSrc(null);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, enabled]);

  return { promiseRef, previewSrc };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    // reader.result is a data: URL; the base64 payload follows the comma.
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
