"use client";
import { PubLeafletDocument } from "lexicons/api";
import { usePublicationData } from "../dashboard/PublicationSWRProvider";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { AtUri } from "@atproto/api";
import { useParams } from "next/navigation";
import { getPostPageData } from "./getPostPageData";
import { PostPageContext } from "./PostPageContext";
import { useContext } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";

export const PostPrevNextButtons = (props: {
  showPrevNext: boolean | undefined;
}) => {
  let postData = useContext(PostPageContext);
  let pub = postData?.documents_in_publications[0]?.publications;

  if (!props.showPrevNext || !pub || !postData) return;

  function getPostLink(uri: string) {
    return pub && uri
      ? `${getPublicationURL(pub)}/${new AtUri(uri).rkey}`
      : "leaflet.pub/not-found";
  }
  let prevPost = postData?.prevNext?.prev;
  let nextPost = postData?.prevNext?.next;

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
