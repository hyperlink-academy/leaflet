"use client";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import {
  Interactions,
  getQuoteCount,
  getCommentCount,
} from "../Interactions/Interactions";
import { PostPageData } from "../getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { useIdentityData } from "components/IdentityProvider";
import { EditTiny } from "components/Icons/EditTiny";
import { SpeedyLink } from "components/SpeedyLink";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import Post from "app/p/[didOrHandle]/[rkey]/l-quote/[quote]/page";
import { Separator } from "components/Layout";
import { ProfilePopover } from "components/ProfilePopover";

export function PostHeader(props: {
  data: PostPageData;
  profile: ProfileViewDetailed;
  preferences: { showComments?: boolean; showMentions?: boolean };
}) {
  let { identity } = useIdentityData();
  let document = props.data;

  const record = document?.normalizedDocument;
  let profile = props.profile;
  let pub = props.data?.documents_in_publications[0]?.publications;

  const formattedDate = useLocalizedDate(
    record?.publishedAt || new Date().toISOString(),
    {
      year: "numeric",
      month: "long",
      day: "2-digit",
    },
  );

  if (!document?.data || !record) return null;
  return (
    <PostHeaderLayout
      pubLink={
        <>
          {pub && (
            <SpeedyLink
              className="font-bold hover:no-underline text-accent-contrast"
              href={document && getPublicationURL(pub)}
            >
              {pub?.name}
            </SpeedyLink>
          )}
          {identity &&
            pub &&
            identity.atp_did === pub.identity_did &&
            document.leaflets_in_publications[0] && (
              <a
                className=" rounded-full  flex place-items-center"
                href={`https://leaflet.pub/${document.leaflets_in_publications[0].leaflet}`}
              >
                <EditTiny className="shrink-0" />
              </a>
            )}
        </>
      }
      postTitle={record.title}
      postDescription={record.description}
      postInfo={
        <>
          <div className="flex flex-row gap-2 items-center">
            {profile ? (
              <ProfilePopover
                didOrHandle={profile.did}
                trigger={
                  <span className="text-tertiary hover:underline">
                    {profile.displayName || profile.handle}
                  </span>
                }
              />
            ) : null}
            {record.publishedAt ? (
              <>
                <Separator classname="h-4!" />
                <p>{formattedDate}</p>
              </>
            ) : null}
          </div>
          <Interactions
            showComments={props.preferences.showComments !== false}
            showMentions={props.preferences.showMentions !== false}
            quotesCount={getQuoteCount(document?.quotesAndMentions || []) || 0}
            commentsCount={
              getCommentCount(document?.comments_on_documents || []) || 0
            }
            recommendsCount={document?.recommendsCount || 0}
          />
        </>
      }
    />
  );
}

export const PostHeaderLayout = (props: {
  pubLink: React.ReactNode;
  postTitle: React.ReactNode | undefined;
  postDescription: React.ReactNode | undefined;
  postInfo: React.ReactNode;
}) => {
  return (
    <div
      className="postHeader w-full flex flex-col px-3 sm:px-4 sm:pt-3 pt-2 pb-5"
      id="post-header"
    >
      <div className="pubInfo flex text-accent-contrast font-bold justify-between w-full">
        {props.pubLink}
      </div>
      <h2
        className={`postTitle text-xl leading-tight pt-0.5 font-bold outline-hidden bg-transparent ${!props.postTitle && "text-tertiary italic"}`}
      >
        {props.postTitle ? props.postTitle : "Untitled"}
      </h2>
      {props.postDescription ? (
        <div className="postDescription italic text-secondary outline-hidden bg-transparent pt-1">
          {props.postDescription}
        </div>
      ) : null}
      <div className="postInfo text-sm text-tertiary pt-3 flex gap-1 flex-wrap justify-between">
        {props.postInfo}
      </div>
    </div>
  );
};
