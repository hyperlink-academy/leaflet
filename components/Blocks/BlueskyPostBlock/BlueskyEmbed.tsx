import { $Typed, is$typed } from "@atproto/api/dist/client/util";
import {
  AppBskyEmbedImages,
  AppBskyEmbedVideo,
  AppBskyEmbedExternal,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedPost,
  AppBskyFeedDefs,
  AppBskyGraphDefs,
  AppBskyLabelerDefs,
} from "@atproto/api";
import { Avatar } from "components/Avatar";

export const BlueskyEmbed = (props: {
  embed: Exclude<AppBskyFeedDefs.PostView["embed"], undefined>;
  postUrl?: string;
  className?: string;
  compact?: boolean;
}) => {
  // check this file from bluesky for ref
  // https://github.com/bluesky-social/social-app/blob/main/bskyembed/src/components/embed.tsx
  switch (true) {
    case AppBskyEmbedImages.isView(props.embed):
      let imageEmbed = props.embed;
      return (
        <div className="imageEmbed flex flex-wrap rounded-md w-full overflow-hidden">
          {imageEmbed.images.map(
            (
              image: {
                fullsize: string;
                alt?: string;
                aspectRatio?: { width: number; height: number };
              },
              i: number,
            ) => {
              const isSingle = imageEmbed.images.length === 1;
              const aspectRatio = image.aspectRatio
                ? image.aspectRatio.width / image.aspectRatio.height
                : undefined;

              return (
                <img
                  key={i}
                  src={image.fullsize}
                  alt={image.alt || "Post image"}
                  style={
                    isSingle && aspectRatio
                      ? { aspectRatio: String(aspectRatio) }
                      : undefined
                  }
                  className={`
                    overflow-hidden w-full object-cover
                    ${isSingle && "max-h-[800px]"}
                    ${imageEmbed.images.length === 2 && "basis-1/2 aspect-square"}
                    ${imageEmbed.images.length === 3 && "basis-1/3 aspect-2/3"}
                    ${
                      imageEmbed.images.length === 4
                        ? "basis-1/2 aspect-3/2"
                        : `basis-1/${imageEmbed.images.length}`
                    }
                  `}
                />
              );
            },
          )}
        </div>
      );
    case AppBskyEmbedExternal.isView(props.embed):
      let externalEmbed = props.embed;
      let isGif = externalEmbed.external.uri.includes(".gif");
      if (isGif) {
        return (
          <div className="flex flex-col border border-border-light rounded-md overflow-hidden aspect-video w-full ">
            <img
              src={externalEmbed.external.uri}
              alt={externalEmbed.external.title}
              className="w-full h-full object-cover"
            />
          </div>
        );
      }
      return (
        <a
          href={externalEmbed.external.uri}
          target="_blank"
          className={`externalLinkEmbed group  border border-border-light rounded-md overflow-hidden hover:no-underline sm:hover:border-accent-contrast selected-border w-full ${props.compact ? "flex items-stretch" : "flex flex-col"}
            ${props.className}`}
        >
          {externalEmbed.external.thumb === undefined ? null : (
            <>
              <div
                className={` overflow-hidden shrink-0 ${props.compact ? "aspect-square h-[113px] hidden sm:block" : "aspect-[1.91/1] w-full "}`}
              >
                <img
                  src={externalEmbed.external.thumb}
                  alt={externalEmbed.external.title}
                  className={`object-cover ${props.compact ? "h-full" : "w-full h-full"}`}
                />
              </div>
              {!props.compact && <hr className="border-border-light" />}
            </>
          )}
          <div
            className={`p-2 flex flex-col w-full min-w-0  ${props.compact && "sm:pl-3 py-1"}`}
          >
            <h4 className="truncate shrink-0" style={{ fontSize: "inherit" }}>
              {externalEmbed.external.title}{" "}
            </h4>
            <div className="grow">
              <p className="text-secondary line-clamp-2">
                {externalEmbed.external.description}
              </p>
            </div>

            <hr className="border-border-light my-1" />
            <div className="text-tertiary text-xs shrink-0 sm:group-hover:text-accent-contrast truncate">
              {externalEmbed.external.uri}
            </div>
          </div>
        </a>
      );
    case AppBskyEmbedVideo.isView(props.embed):
      let videoEmbed = props.embed;
      const videoAspectRatio = videoEmbed.aspectRatio
        ? videoEmbed.aspectRatio.width / videoEmbed.aspectRatio.height
        : 16 / 9;
      return (
        <div
          className={`videoEmbed rounded-md overflow-hidden relative w-full ${props.className}`}
          style={{ aspectRatio: String(videoAspectRatio) }}
        >
          <img
            src={videoEmbed.thumbnail}
            alt={
              "Thumbnail from embedded video. Go to Bluesky to see the full post."
            }
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="overlay absolute inset-0 bg-primary opacity-65" />
          <div className="absolute w-max top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-border-light rounded-md">
            <SeePostOnBluesky postUrl={props.postUrl} />
          </div>
        </div>
      );
    case AppBskyEmbedRecord.isView(props.embed):
      let recordEmbed = props.embed;
      let record = recordEmbed.record;

      if (record === undefined) return;

      // if the record is a feed post
      if (AppBskyEmbedRecord.isViewRecord(record)) {
        // we have to do this nonsense to get a the proper type for the record text
        // we aped it from the bluesky front end (check the link at the top of this file)
        let text: string | null = null;
        if (AppBskyFeedPost.isRecord(record.value)) {
          text = (record.value as AppBskyFeedPost.Record).text;
        }
        return (
          <div className="bskyPostEmbed w-full flex gap-2 items-start relative  overflow-hidden p-2! text-xs  block-border">
            <Avatar
              src={record.author?.avatar}
              displayName={record.author?.displayName}
              size="small"
            />
            <div className="flex flex-col ">
              <div className="flex gap-1">
                <div className=" font-bold text-secondary mr-1">
                  {record.author?.displayName}
                </div>
                <a
                  className="text-xs text-tertiary hover:underline"
                  target="_blank"
                  href={`https://bsky.app/profile/${record.author?.handle}`}
                >
                  @{record.author?.handle}
                </a>
              </div>
              <div className="flex flex-col gap-2 ">
                {text && (
                  <pre
                    className={`whitespace-pre-wrap text-secondary ${props.compact ? "line-clamp-6" : ""}`}
                  >
                    {text}
                  </pre>
                )}
                {/*{record.embeds !== undefined
                  ? record.embeds.map((embed, index) => (
                      <BlueskyEmbed embed={embed} key={index} compact />
                    ))
                  : null}*/}
              </div>
            </div>
          </div>
        );
      }

      //  labeller, starterpack or feed
      if (
        AppBskyFeedDefs.isGeneratorView(record) ||
        AppBskyLabelerDefs.isLabelerView(record) ||
        AppBskyGraphDefs.isStarterPackViewBasic(record)
      )
        return <SeePostOnBluesky postUrl={props.postUrl} />;

      // post is blocked or not found
      if (
        AppBskyFeedDefs.isBlockedPost(record) ||
        AppBskyFeedDefs.isNotFoundPost(record)
      )
        return <PostNotAvailable />;

      if (AppBskyEmbedRecord.isViewDetached(record)) return null;

      return <SeePostOnBluesky postUrl={props.postUrl} />;

    // I am not sure when this case will be used? so I'm commenting it out for now
    case AppBskyEmbedRecordWithMedia.isView(props.embed) &&
      AppBskyEmbedRecord.isViewRecord(props.embed.record.record):
      return (
        <div className={`bskyEmbed flex flex-col gap-2`}>
          <BlueskyEmbed embed={props.embed.media} />
          <BlueskyEmbed
            embed={{
              $type: "app.bsky.embed.record#view",
              record: props.embed.record.record,
            }}
          />
        </div>
      );

    default:
      return <SeePostOnBluesky postUrl={props.postUrl} />;
  }
};

const SeePostOnBluesky = (props: { postUrl: string | undefined }) => {
  return (
    <a
      href={props.postUrl}
      target="_blank"
      className={`block-border flex flex-col p-3 font-normal rounded-md!  border text-tertiary italic text-center hover:no-underline hover:border-accent-contrast ${props.postUrl === undefined && "pointer-events-none"} `}
    >
      <div> This media is not supported... </div>{" "}
      {props.postUrl === undefined ? null : (
        <div>
          See the <span className=" text-accent-contrast">full post</span> on
          Bluesky!
        </div>
      )}
    </a>
  );
};

export const PostNotAvailable = () => {
  return (
    <div className="px-3 py-6 w-full rounded-md bg-border-light text-tertiary italic text-center">
      This Bluesky post is not available...
    </div>
  );
};
