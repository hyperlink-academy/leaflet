"use client";
import { useEffect, useMemo } from "react";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { AtUri } from "@atproto/api";
import { useDocument } from "contexts/DocumentContext";
import { useWarmRoutes } from "src/hooks/useWarmRoutes";
import { useImagePreload } from "src/hooks/useImagePreload";
import { useImagesSettled } from "src/hooks/useImagesSettled";
import { SpeedyLink } from "components/SpeedyLink";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { Separator } from "components/Layout";
import {
  resolvePrevNextDirection,
  type PrevNextDirection,
} from "src/utils/mergePreferences";
import { forgetScrollPosition } from "src/hooks/usePreserveScroll";

type PostRef = { uri: string; title: string };

// Paging to another post is starting it, not returning to it, so it opens at
// the top even if the reader has been there before. The key matches the
// PageWrapper id in LinearDocumentPage / CanvasPage.
function PostNavLink(props: {
  post: PostRef;
  href: string;
  className?: string;
  eager?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SpeedyLink
      href={props.href}
      eager={props.eager}
      className={props.className}
      onClick={() => forgetScrollPosition(`post-page-${props.post.uri}`)}
    >
      {props.children}
    </SpeedyLink>
  );
}

export const PostPrevNextButtons = (props: {
  showPrevNext: boolean;
  showFirstLast: boolean;
  direction?: string;
}) => {
  const { prevNext, publication, uri } = useDocument();
  const warmRoutes = useWarmRoutes();

  // Nothing is warmed until this post has its own art: a speculative fetch is
  // low priority, but so is an image below the fold, and the two then share the
  // connection evenly. Being right about where the reader is going next isn't
  // worth the page they're reading arriving later.
  const settled = useImagesSettled(uri);

  // Each button covers two posts: the neighbour it links to and the one that
  // neighbour in turn leads to, so a run of page turns never stops to fetch.
  // The links warm their own target (`eager` below); only the second hop has no
  // link of its own to do it.
  const { prevPreload, nextPreload } = prevNext ?? {};
  const showPrevNext = props.showPrevNext;
  useEffect(() => {
    if (!settled || !showPrevNext || !publication) return;
    const base = getPublicationURL(publication);
    warmRoutes(
      [prevPreload, nextPreload].map((u) =>
        u ? `${base}/${new AtUri(u).rkey}` : undefined,
      ),
    );
  }, [
    prevPreload,
    nextPreload,
    publication,
    settled,
    showPrevNext,
    warmRoutes,
  ]);

  // Art is warmed one post each way — the only two a reader is about to open.
  // The URLs come down with this page (getPostPageData), so there's nothing to
  // fetch first: warming starts the moment this post has settled.
  useImagePreload(
    useMemo(
      () =>
        !settled || !showPrevNext
          ? []
          : // Forward first — a reader paging through a run of posts is far more
            // likely to keep going that way than to turn back.
            [prevNext?.next, prevNext?.prev].flatMap(
              (post) =>
                post?.images?.map((src, index) => ({
                  src,
                  // Only each post's opening image is decoded — that's the one
                  // that has to be ready the instant the page turn lands.
                  decode: index === 0,
                })) ?? [],
            ),
      [settled, showPrevNext, prevNext?.next, prevNext?.prev],
    ),
  );

  if ((!props.showPrevNext && !props.showFirstLast) || !publication)
    return null;

  function getPostLink(uri: string) {
    return publication && uri
      ? `${getPublicationURL(publication)}/${new AtUri(uri).rkey}`
      : "leaflet.pub/not-found";
  }
  let prevPost =
    props.showPrevNext && prevNext?.prev ? prevNext?.prev : undefined;
  let nextPost =
    props.showPrevNext && prevNext?.next ? prevNext?.next : undefined;
  let firstPost =
    props.showFirstLast && prevNext?.first && prevNext.first.uri !== uri
      ? prevNext?.first
      : undefined;
  let lastPost =
    props.showFirstLast && prevNext?.last && prevNext.last.uri !== uri
      ? prevNext?.last
      : undefined;

  let { adjacent, edge } = arrangeByDirection(
    resolvePrevNextDirection(props.direction),
    { prevPost, nextPost, firstPost, lastPost },
  );

  return (
    <div className="flex flex-col gap-0.5 w-full px-3 sm:px-4 pb-3 pt-2">
      <div className="flex justify-between w-full gap-8 ">
        <div className="flex gap-2 items-center grow basis-1/2 min-w-0">
          {edge.left && (
            <>
              <PostNavLink
                post={edge.left}
                href={getPostLink(edge.left.uri)}
                className="flex flex-row gap-1 items-center min-w-4 "
              >
                <DoubleArrowRightTiny className={`rotate-180 shrink-0 `} />
                {!adjacent.left && (
                  <div className="min-w-0 truncate">{edge.left.title}</div>
                )}
              </PostNavLink>
              {adjacent.left && <Separator />}
            </>
          )}
          {adjacent.left ? (
            <PostNavLink
              post={adjacent.left}
              href={getPostLink(adjacent.left.uri)}
              // The two posts either side are the only ones a reader is likely
              // to open next, so they're worth warming as soon as this post can
              // spare the bandwidth — it's what makes paging through a chapter
              // feel like turning pages. Pointing at the link still warms it
              // either way.
              eager={settled}
              className="flex flex-row gap-1 items-center min-w-0 grow"
            >
              <ArrowRightTiny className="rotate-180 shrink-0" />
              <div className="min-w-0 truncate">{adjacent.left.title}</div>
            </PostNavLink>
          ) : (
            <div />
          )}
        </div>
        <div className="flex gap-2 items-center grow justify-end basis-1/2 min-w-0">
          {adjacent.right ? (
            <>
              <PostNavLink
                post={adjacent.right}
                href={getPostLink(adjacent.right.uri)}
                eager={settled}
                className="flex flex-row gap-1 items-center truncate min-w-0 grow w-fit max-w-full text-right justify-end"
              >
                <div className="min-w-0 truncate ">{adjacent.right.title}</div>
                <ArrowRightTiny className="shrink-0" />
              </PostNavLink>
            </>
          ) : (
            <div />
          )}
          {edge.right && (
            <>
              {adjacent.right && <Separator />}
              <PostNavLink
                post={edge.right}
                href={getPostLink(edge.right.uri)}
                className="flex flex-row gap-1 items-center min-w-4"
              >
                {!adjacent.right && (
                  <div className="min-w-0 truncate">{edge.right.title}</div>
                )}
                <DoubleArrowRightTiny className={`shrink-0 `} />
              </PostNavLink>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function arrangeByDirection(
  direction: PrevNextDirection,
  posts: {
    prevPost?: PostRef;
    nextPost?: PostRef;
    firstPost?: PostRef;
    lastPost?: PostRef;
  },
): {
  adjacent: { left?: PostRef; right?: PostRef };
  edge: { left?: PostRef; right?: PostRef };
} {
  if (direction === "ltr")
    return {
      adjacent: { left: posts.prevPost, right: posts.nextPost },
      edge: { left: posts.firstPost, right: posts.lastPost },
    };
  return {
    adjacent: { left: posts.nextPost, right: posts.prevPost },
    edge: { left: posts.lastPost, right: posts.firstPost },
  };
}
