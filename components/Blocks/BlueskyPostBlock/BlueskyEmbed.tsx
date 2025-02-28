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

export const BlueskyEmbed = (props: {
  embed: Exclude<AppBskyFeedDefs.PostView["embed"], undefined>;
  postUrl?: string;
}) => {
  // check this file from bluesky for ref
  // https://github.com/bluesky-social/social-app/blob/main/bskyembed/src/components/embed.tsx
  switch (true) {
    case AppBskyEmbedImages.isView(props.embed):
      let imageEmbed = props.embed;
      return (
        <div className="flex flex-wrap rounded-md w-full overflow-hidden">
          {imageEmbed.images.map(
            (image: { fullsize: string; alt?: string }, i: number) => (
              <img
                key={i}
                src={image.fullsize}
                alt={image.alt || "Post image"}
                className={`
                  overflow-hidden w-full object-cover
                  ${imageEmbed.images.length === 1 && "h-auto max-h-[800px]"}
                  ${imageEmbed.images.length === 2 && "basis-1/2 aspect-1/1"}
                  ${imageEmbed.images.length === 3 && "basis-1/3 aspect-2/3"}
                    ${
                      imageEmbed.images.length === 4
                        ? "basis-1/2 aspect-[3/2]"
                        : `basis-1/${imageEmbed.images.length} `
                    }
                `}
              />
            ),
          )}
        </div>
      );
    case AppBskyEmbedExternal.isView(props.embed):
      let externalEmbed = props.embed;
      let isGif = externalEmbed.external.uri.includes(".gif");
      if (isGif) {
        return (
          <div className="flex flex-col border border-border-light rounded-md overflow-hidden">
            <img
              src={externalEmbed.external.uri}
              alt={externalEmbed.external.title}
              className="object-cover"
            />
          </div>
        );
      }
      return (
        <a
          href={externalEmbed.external.uri}
          target="_blank"
          className="group flex flex-col border border-border-light rounded-md overflow-hidden hover:no-underline sm:hover:border-accent-contrast selected-border"
        >
          {externalEmbed.external.thumb === undefined ? null : (
            <>
              <img
                src={externalEmbed.external.thumb}
                alt={externalEmbed.external.title}
                className="object-cover"
              />

              <hr className="border-border-light " />
            </>
          )}
          <div className="p-2 flex flex-col gap-1">
            <div className="flex flex-col">
              <h4>{externalEmbed.external.title}</h4>
              <p className="text-secondary">
                {externalEmbed.external.description}
              </p>
            </div>
            <hr className="border-border-light mt-1" />
            <div className="text-tertiary text-xs sm:group-hover:text-accent-contrast">
              {externalEmbed.external.uri}
            </div>
          </div>
        </a>
      );
    case AppBskyEmbedVideo.isView(props.embed):
      let videoEmbed = props.embed;
      return (
        <div className="rounded-md overflow-hidden relative">
          <img
            src={videoEmbed.thumbnail}
            alt={
              "Thumbnail from embedded video. Go to Bluesky to see the full post."
            }
            className={`overflow-hidden w-full object-cover`}
          />
          <div className="overlay absolute top-0 right-0 left-0 bottom-0 bg-primary opacity-65" />
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
          <div
            className={`flex flex-col gap-1 relative w-full overflow-hidden sm:p-3 p-2 text-xs  block-border`}
          >
            <div className="bskyAuthor w-full flex items-center gap-1">
              <img
                src={record.author?.avatar}
                alt={`${record.author?.displayName}'s avatar`}
                className="shink-0 w-6 h-6 rounded-full border border-border-light"
              />
              <div className=" font-bold text-secondary">
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
              {text && <pre className="whitespace-pre-wrap">{text}</pre>}
              {record.embeds !== undefined
                ? record.embeds.map((embed) => <BlueskyEmbed embed={embed} />)
                : null}
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
    // case AppBskyEmbedRecordWithMedia.isView(props.embed):
    //   const recordWithMediaEmbed = props.embed;
    //   return <div>This is a record with Media </div>;

    default:
      return <SeePostOnBluesky postUrl={props.postUrl} />;
  }
};

const SeePostOnBluesky = (props: { postUrl: string | undefined }) => {
  return (
    <a
      href={props.postUrl}
      target="_blank"
      className={`block-border flex flex-col p-3 font-normal !rounded-md  border text-tertiary italic text-center hover:no-underline hover:border-accent-contrast ${props.postUrl === undefined && "pointer-events-none"} `}
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
