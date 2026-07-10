"use client";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { AtUri } from "@atproto/api";
import { useDocument } from "contexts/DocumentContext";
import { SpeedyLink } from "components/SpeedyLink";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { DoubleArrowRightTiny } from "components/Icons/DoubleArrowRightTiny";
import { Separator } from "components/Layout";

export const PostPrevNextButtons = (props: {
  showPrevNext: boolean;
  showFirstLast: boolean;
}) => {
  const { prevNext, publication, uri } = useDocument();

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

  return (
    <div className="flex flex-col gap-0.5 w-full px-3 sm:px-4 pb-3 pt-2">
      <div className="flex justify-between w-full gap-8 ">
        <div className="flex gap-2 items-center grow basis-1/2 min-w-0">
          {lastPost && (
            <>
              <SpeedyLink
                href={getPostLink(lastPost.uri)}
                className="flex flex-row gap-1 items-center min-w-4 "
              >
                <DoubleArrowRightTiny className={`rotate-180 shrink-0 `} />
                {!nextPost && (
                  <div className="min-w-0 truncate">{lastPost.title}</div>
                )}
              </SpeedyLink>
              {nextPost && <Separator />}
            </>
          )}
          {nextPost ? (
            <SpeedyLink
              href={getPostLink(nextPost.uri)}
              className="flex flex-row gap-1 items-center min-w-0 grow"
            >
              <ArrowRightTiny className="rotate-180 shrink-0" />
              <div className="min-w-0 truncate">{nextPost.title}</div>
            </SpeedyLink>
          ) : (
            <div />
          )}
        </div>
        <div className="flex gap-2 items-center grow justify-end basis-1/2 min-w-0">
          {prevPost ? (
            <>
              <SpeedyLink
                href={getPostLink(prevPost.uri)}
                className="flex flex-row gap-1 items-center truncate min-w-0 grow w-fit max-w-full text-right justify-end"
              >
                <div className="min-w-0 truncate ">{prevPost.title}</div>
                <ArrowRightTiny className="shrink-0" />
              </SpeedyLink>
            </>
          ) : (
            <div />
          )}
          {firstPost && (
            <>
              {prevPost && <Separator />}
              <SpeedyLink
                href={getPostLink(firstPost.uri)}
                className="flex flex-row gap-1 items-center min-w-4"
              >
                {!prevPost && (
                  <div className="min-w-0 truncate">{firstPost.title}</div>
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
