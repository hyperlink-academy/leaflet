"use client";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { AtUri } from "@atproto/api";
import { useDocument } from "contexts/DocumentContext";
import { SpeedyLink } from "components/SpeedyLink";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";

export const PostPrevNextButtons = (props: {
  showPrevNext: boolean | undefined;
}) => {
  const { prevNext, publication } = useDocument();

  if (!props.showPrevNext || !publication) return null;

  function getPostLink(uri: string) {
    return publication && uri
      ? `${getPublicationURL(publication)}/${new AtUri(uri).rkey}`
      : "leaflet.pub/not-found";
  }
  let prevPost = prevNext?.prev;
  let nextPost = prevNext?.next;

  return (
    <div className="flex flex-col gap-1 w-full px-3 sm:px-4 pb-2 pt-2">
      {/*<hr className="border-border-light" />*/}
      <div className="flex justify-between w-full gap-8 ">
        {nextPost ? (
          <SpeedyLink
            href={getPostLink(nextPost.uri)}
            className="flex gap-1 items-center truncate min-w-0 basis-1/2"
          >
            <ArrowRightTiny className="rotate-180 shrink-0" />
            <div className="min-w-0 truncate">{nextPost.title}</div>
          </SpeedyLink>
        ) : (
          <div />
        )}
        {prevPost ? (
          <SpeedyLink
            href={getPostLink(prevPost.uri)}
            className="flex gap-1 items-center truncate min-w-0 basis-1/2 justify-end"
          >
            <div className="min-w-0 truncate">{prevPost.title}</div>
            <ArrowRightTiny className="shrink-0" />
          </SpeedyLink>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
