"use client";
import type { ReactNode } from "react";
import { useDocument } from "contexts/DocumentContext";
import { useWarmAdjacentPosts } from "./useWarmAdjacentPosts";
import { usePostPrevNext } from "./usePostPrevNext";
import { SpeedyLink } from "components/SpeedyLink";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { Separator } from "components/Layout";
import {
  resolvePrevNextDirection,
  type PrevNextDirection,
} from "src/utils/mergePreferences";

type PostRef = { uri: string; title: string };

const PLACEHOLDER_POSTS = {
  prev: { uri: "", title: "Previous" },
  next: { uri: "", title: "Next" },
  first: { uri: "", title: "First" },
  last: { uri: "", title: "Last" },
};

export const PostPrevNextButtons = (props: {
  showPrevNext: boolean;
  showFirstLast: boolean;
  direction?: string;
}) => {
  const { publication, uri } = useDocument();
  const { prevNext, hrefFor, loading } = usePostPrevNext();

  useWarmAdjacentPosts(props.showPrevNext, prevNext, hrefFor);

  if ((!props.showPrevNext && !props.showFirstLast) || !publication)
    return null;

  const posts = loading ? PLACEHOLDER_POSTS : prevNext;
  const getPostLink = (post: PostRef) =>
    loading ? undefined : hrefFor(post.uri);
  const arrowColor = loading ? "text-border" : "";

  let prevPost = props.showPrevNext ? posts?.prev : undefined;
  let nextPost = props.showPrevNext ? posts?.next : undefined;
  let firstPost =
    props.showFirstLast && posts?.first && posts.first.uri !== uri
      ? posts.first
      : undefined;
  let lastPost =
    props.showFirstLast && posts?.last && posts.last.uri !== uri
      ? posts.last
      : undefined;

  let { adjacent, edge } = arrangeByDirection(
    resolvePrevNextDirection(props.direction),
    { prevPost, nextPost, firstPost, lastPost },
  );

  return (
    <div className="postPrevNext flex flex-col gap-0.5 w-full px-3 sm:px-4 pb-3 pt-2">
      <div className="flex justify-between w-full gap-8 ">
        <div className="flex gap-2 items-center grow basis-1/2 min-w-0">
          {edge.left && (
            <>
              <PostNavLink
                href={getPostLink(edge.left)}
                className="flex flex-row gap-1 items-center min-w-4 "
              >
                <DoubleArrowRightTiny
                  className={`rotate-180 shrink-0 ${arrowColor}`}
                />
                {!adjacent.left && (
                  <div className="min-w-0 truncate">{edge.left.title}</div>
                )}
              </PostNavLink>
              {adjacent.left && <Separator />}
            </>
          )}
          {adjacent.left ? (
            <PostNavLink
              href={getPostLink(adjacent.left)}
              className="flex flex-row gap-1 items-center min-w-0 grow"
            >
              <ArrowRightTiny className={`rotate-180 shrink-0 ${arrowColor}`} />
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
                href={getPostLink(adjacent.right)}
                className="flex flex-row gap-1 items-center truncate min-w-0 grow w-fit max-w-full text-right justify-end"
              >
                <div className="min-w-0 truncate ">{adjacent.right.title}</div>
                <ArrowRightTiny className={`shrink-0 ${arrowColor}`} />
              </PostNavLink>
            </>
          ) : (
            <div />
          )}
          {edge.right && (
            <>
              {adjacent.right && <Separator />}
              <PostNavLink
                href={getPostLink(edge.right)}
                className="flex flex-row gap-1 items-center min-w-4"
              >
                {!adjacent.right && (
                  <div className="min-w-0 truncate">{edge.right.title}</div>
                )}
                <DoubleArrowRightTiny className={`shrink-0 ${arrowColor}`} />
              </PostNavLink>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function PostNavLink(props: {
  href: string | undefined;
  className: string;
  children: ReactNode;
}) {
  if (props.href === undefined)
    return (
      <div
        aria-hidden
        className={`${props.className} text-tertiary animate-pulse`}
      >
        {props.children}
      </div>
    );
  return (
    <SpeedyLink href={props.href} className={props.className}>
      {props.children}
    </SpeedyLink>
  );
}

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
