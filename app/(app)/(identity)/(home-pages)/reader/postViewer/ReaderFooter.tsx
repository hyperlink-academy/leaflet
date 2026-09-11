"use client";
import { usePathname } from "next/navigation";
import { useIsMobile } from "src/hooks/isMobile";
import useSWR from "swr";
import type { Post } from "actions/reader/getReaderFeed";
import type { NormalizedPublication } from "lexicons/src/normalize";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { getPublicationNewsletterMode } from "actions/publications/getNewsletterMode";
import { getPostInteractions } from "./postInteractions";
import { ReaderFooterMobile } from "./ReaderFooterMobile";
import { ReaderFooterDesktop } from "./ReaderFooterDesktop";
import { AtUri } from "@atproto/syntax";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

const READER_PAGE_NAMES: { [pathname: string]: string } = {
  "/reader": "Inbox",
  "/reader/trending": "Trending",
  "/reader/new": "New",
};

// Everything the two layouts need, resolved once here so mobile and desktop
// can't drift in behavior while they diverge in shape.
export type ReaderFooterVariantProps = {
  post: Post | null;
  postRecord: NonNullable<Post["documents"]["data"]> | null;
  postUrl: string | null;
  pubRecord: NormalizedPublication | undefined;
  pubIcon: string | undefined;
  newsletterMode: boolean;
  readerPageName: string;
  interactions: ReturnType<typeof getPostInteractions> | null;
  hasPrev: boolean;
  hasNext: boolean;
  prevPost: () => void;
  nextPost: () => void;
  closeViewer: () => void;
  discussionOpen: boolean;
  setDiscussionOpen: (open: boolean) => void;
};

export const ReaderFooter = (props: {
  post: Post | null;
  postRecord: NonNullable<Post["documents"]["data"]> | null;
  postUrl: string | null;
}) => {
  let { post, postRecord, postUrl } = props;
  let {
    queue,
    index,
    nextPost,
    prevPost,
    closeViewer,
    discussionOpen,
    setDiscussionOpen,
  } = useReaderPostViewer();

  let pubUri = post?.publication?.uri;
  let { data: newsletterMode } = useSWR(
    pubUri ? `newsletter-mode-${pubUri}` : null,
    () => getPublicationNewsletterMode(pubUri!),
    { revalidateOnFocus: false },
  );

  let pubRecord = post?.publication?.pubRecord ?? undefined;
  let pubIcon =
    pubRecord?.icon && pubUri
      ? blobRefToSrc(pubRecord.icon.ref, new AtUri(pubUri).host)
      : undefined;
  let pathname = usePathname();
  let isMobile = useIsMobile();

  let variantProps: ReaderFooterVariantProps = {
    post,
    postRecord,
    postUrl,
    pubRecord,
    pubIcon,
    newsletterMode: newsletterMode ?? false,
    readerPageName: READER_PAGE_NAMES[pathname] ?? "Reader",
    interactions: post ? getPostInteractions(post) : null,
    hasPrev: index !== null && index > 0,
    hasNext: index !== null && index < queue.length - 1,
    prevPost,
    nextPost,
    closeViewer,
    discussionOpen,
    setDiscussionOpen,
  };

  return isMobile ? (
    <ReaderFooterMobile {...variantProps} />
  ) : (
    <ReaderFooterDesktop {...variantProps} />
  );
};
