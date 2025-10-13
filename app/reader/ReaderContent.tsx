"use client";
import { AtUri } from "@atproto/api";
import { Interactions } from "app/lish/[did]/[publication]/[rkey]/Interactions/Interactions";
import { PubIcon } from "components/ActionBar/Publications";
import { ButtonPrimary } from "components/Buttons";
import { CommentTiny } from "components/Icons/CommentTiny";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { SpeedyLink } from "components/SpeedyLink";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { useSmoker } from "components/Toast";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { Json } from "supabase/database.types";

export const ReaderContent = (props: {
  root_entity: string;
  posts: {
    publication: {
      href: string;
      pubRecord: Json;
      uri: string;
    };
    documents: {
      data: Json;
      uri: string;
      indexed_at: string;
      comments_on_documents:
        | {
            count: number;
          }[]
        | undefined;
      document_mentions_in_bsky:
        | {
            count: number;
          }[]
        | undefined;
    };
  }[];
}) => {
  if (props.posts.length === 0) return <ReaderEmpty />;
  return (
    <div className="flex flex-col gap-3">
      {props.posts?.map((p) => <Post {...p} key={p.documents.uri} />)}
    </div>
  );
};

const Post = (props: {
  publication: {
    pubRecord: Json;
    uri: string;
    href: string;
  };
  documents: {
    data: Json;
    uri: string;
    indexed_at: string;
    comments_on_documents:
      | {
          count: number;
        }[]
      | undefined;
    document_mentions_in_bsky:
      | {
          count: number;
        }[]
      | undefined;
  };
}) => {
  let pubRecord = props.publication.pubRecord as PubLeafletPublication.Record;

  let postRecord = props.documents.data as PubLeafletDocument.Record;
  let postUri = new AtUri(props.documents.uri);

  let theme = usePubTheme(pubRecord);
  let backgroundImage = pubRecord?.theme?.backgroundImage?.image?.ref
    ? blobRefToSrc(
        pubRecord?.theme?.backgroundImage?.image?.ref,
        new AtUri(props.publication.uri).host,
      )
    : null;

  let backgroundImageRepeat = pubRecord?.theme?.backgroundImage?.repeat;
  let backgroundImageSize = pubRecord?.theme?.backgroundImage?.width || 500;

  let showPageBackground = pubRecord.theme?.showPageBackground;

  let quotes = props.documents.document_mentions_in_bsky?.[0]?.count || 0;
  let comments =
    pubRecord.preferences?.showComments === false
      ? 0
      : props.documents.comments_on_documents?.[0]?.count || 0;

  return (
    <BaseThemeProvider {...theme} local>
      <div
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
        className={`no-underline! flex flex-row gap-2 w-full relative
          bg-bg-leaflet
          border border-border-light rounded-lg
          sm:p-2 p-2 selected-outline
          hover:outline-accent-contrast hover:border-accent-contrast
          `}
      >
        <SpeedyLink
          className="h-full w-full absolute top-0 left-0 z-0"
          href={`${props.publication.href}/${postUri.rkey}`}
        />
        <div
          className={`${showPageBackground ? "bg-bg-page " : "bg-transparent"}  rounded-md w-full  px-[10px] pt-2 pb-2 z-1 pointer-events-none`}
          style={{
            backgroundColor: showPageBackground
              ? "rgba(var(--bg-page), var(--bg-page-alpha))"
              : "transparent",
          }}
        >
          <h3 className="text-primary truncate">{postRecord.title}</h3>

          <p className="text-secondary">{postRecord.description}</p>
          <div className="flex justify-between items-end">
            <div className="flex flex-col-reverse md:flex-row md gap-3 md:gap-2 text-sm text-tertiary items-center justify-start pt-1 md:pt-3">
              <PubInfo
                href={props.publication.href}
                pubRecord={pubRecord}
                uri={props.publication.uri}
              />
              <Separator classname="h-4 !min-h-0 md:block hidden" />
              <PostInfo
                author="NAME HERE"
                publishedAt={postRecord.publishedAt}
              />
            </div>

            <PostInterations
              postUrl={`${props.publication.href}/${postUri.rkey}`}
              quotesCount={quotes}
              commentsCount={comments}
              showComments={pubRecord.preferences?.showComments}
            />
          </div>
        </div>
      </div>
    </BaseThemeProvider>
  );
};

const PubInfo = (props: {
  href: string;
  pubRecord: PubLeafletPublication.Record;
  uri: string;
}) => {
  return (
    <SpeedyLink
      href={props.href}
      className="text-accent-contrast font-bold no-underline text-sm flex gap-1 items-center md:w-fit w-full relative shrink-0"
      style={{ pointerEvents: "all" }}
    >
      <PubIcon small record={props.pubRecord} uri={props.uri} />
      {props.pubRecord.name}
    </SpeedyLink>
  );
};

const PostInfo = (props: {
  author: string;
  publishedAt: string | undefined;
}) => {
  return (
    <div className="flex gap-2 grow items-center shrink-0">
      NAME HERE
      {props.publishedAt && (
        <>
          <Separator classname="h-4 !min-h-0" />
          {new Date(props.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}{" "}
        </>
      )}
    </div>
  );
};

const PostInterations = (props: {
  quotesCount: number;
  commentsCount: number;
  postUrl: string;
  showComments: boolean | undefined;
}) => {
  let smoker = useSmoker();
  return (
    <div className={`flex gap-2 text-tertiary text-sm  items-center`}>
      {props.quotesCount === 0 ? null : (
        <div className={`flex gap-1 items-center `}>
          <span className="sr-only">Post quotes</span>
          <QuoteTiny aria-hidden /> {props.quotesCount}
        </div>
      )}
      {props.showComments === false ? null : (
        <div className={`flex gap-1 items-center`}>
          <span className="sr-only">Post comments</span>
          <CommentTiny aria-hidden /> {props.commentsCount}
        </div>
      )}
      <Separator classname="h-4 !min-h-0" />
      <button
        id={`copy-post-link-${props.postUrl}`}
        className="flex gap-1 items-center hover:font-bold px-1"
        style={{ pointerEvents: "all" }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log("copied");
          let mouseX = e.clientX;
          let mouseY = e.clientY;

          if (!props.postUrl) return;
          navigator.clipboard.writeText(props.postUrl);

          smoker({
            text: <strong>Copied Link!</strong>,
            position: {
              y: mouseY,
              x: mouseX,
            },
          });
        }}
      >
        Share
      </button>
    </div>
  );
};
const ReaderEmpty = () => {
  return (
    <div className="flex flex-col gap-2 container bg-[rgba(var(--bg-page),.7)] sm:p-4 p-3 justify-between text-center font-bold text-tertiary">
      Nothing to read yet… <br />
      Subscribe to publications and find their posts here!
      <ButtonPrimary className="mx-auto place-self-center">
        <DiscoverSmall /> Discover Publications
      </ButtonPrimary>
    </div>
  );
};
