"use client";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { AtUri } from "@atproto/api";
import { useDocument } from "contexts/DocumentContext";
import { useWarmAdjacentPosts } from "./useWarmAdjacentPosts";
import { SpeedyLink } from "components/SpeedyLink";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { Separator } from "components/Layout";
import {
  resolvePrevNextDirection,
  type PrevNextDirection,
} from "src/utils/mergePreferences";

type PostRef = { uri: string; title: string };

export const PostPrevNextButtons = (props: {
  showPrevNext: boolean;
  showFirstLast: boolean;
  direction?: string;
}) => {
  const { prevNext, publication, uri } = useDocument();

  useWarmAdjacentPosts(props.showPrevNext);

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
              <SpeedyLink
                href={getPostLink(edge.left.uri)}
                className="flex flex-row gap-1 items-center min-w-4 "
              >
                <DoubleArrowRightTiny className={`rotate-180 shrink-0 `} />
                {!adjacent.left && (
                  <div className="min-w-0 truncate">{edge.left.title}</div>
                )}
              </SpeedyLink>
              {adjacent.left && <Separator />}
            </>
          )}
          {adjacent.left ? (
            <SpeedyLink
              href={getPostLink(adjacent.left.uri)}
              className="flex flex-row gap-1 items-center min-w-0 grow"
            >
              <ArrowRightTiny className="rotate-180 shrink-0" />
              <div className="min-w-0 truncate">{adjacent.left.title}</div>
            </SpeedyLink>
          ) : (
            <div />
          )}
        </div>
        <div className="flex gap-2 items-center grow justify-end basis-1/2 min-w-0">
          {adjacent.right ? (
            <>
              <SpeedyLink
                href={getPostLink(adjacent.right.uri)}
                className="flex flex-row gap-1 items-center truncate min-w-0 grow w-fit max-w-full text-right justify-end"
              >
                <div className="min-w-0 truncate ">{adjacent.right.title}</div>
                <ArrowRightTiny className="shrink-0" />
              </SpeedyLink>
            </>
          ) : (
            <div />
          )}
          {edge.right && (
            <>
              {adjacent.right && <Separator />}
              <SpeedyLink
                href={getPostLink(edge.right.uri)}
                className="flex flex-row gap-1 items-center min-w-4"
              >
                {!adjacent.right && (
                  <div className="min-w-0 truncate">{edge.right.title}</div>
                )}
                <DoubleArrowRightTiny className={`shrink-0 `} />
              </SpeedyLink>
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
