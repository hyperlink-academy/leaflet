import {
  isImage,
  View as ImageView,
} from "@atproto/api/dist/client/types/app/bsky/embed/images";
import {
  isExternal,
  View as ExternalView,
} from "@atproto/api/dist/client/types/app/bsky/embed/external";
import {
  isViewRecord as isRecord,
  ViewRecord as RecordView,
} from "@atproto/api/dist/client/types/app/bsky/embed/record";
import {
  isView as isRecordWithMedia,
  View as RecordWithMediaView,
} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";
import {
  isView as isVideo,
  View as VideoView,
} from "@atproto/api/dist/client/types/app/bsky/embed/video";
import { $Typed } from "@atproto/api/dist/client/util";
import type * as AppBskyEmbedImages from "@atproto/api/dist/client/types/app/bsky/embed/images";
import type * as AppBskyEmbedVideo from "@atproto/api/dist/client/types/app/bsky/embed/video";
import type * as AppBskyEmbedExternal from "@atproto/api/dist/client/types/app/bsky/embed/external";
import type * as AppBskyEmbedRecord from "@atproto/api/dist/client/types/app/bsky/embed/record";
import type * as AppBskyEmbedRecordWithMedia from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";

export const BlueskyEmbed = (props: {
  embed:
    | $Typed<AppBskyEmbedImages.View>
    | $Typed<AppBskyEmbedVideo.View>
    | $Typed<AppBskyEmbedExternal.View>
    | $Typed<AppBskyEmbedRecord.View>
    | $Typed<AppBskyEmbedRecordWithMedia.View>
    | { $type: string };
}) => {
  console.log(props.embed);

  switch (true) {
    case props.embed.$type === "app.bsky.embed.images#view":
      return (
        <div className="flex flex-wrap gap-2">
          {(props.embed as ImageView).images.map(
            (image: { fullsize: string; alt?: string }, i: number) => (
              <img
                key={i}
                src={image.fullsize}
                alt={image.alt || "Post image"}
                className="rounded-md max-h-[300px] object-cover"
              />
            ),
          )}
        </div>
      );
    case props.embed.$type === "app.bsky.embed.external#view":
      return <div>This is an external link </div>;
    case props.embed.$type === "app.bsky.embed.record#view":
      return <div>This is a record </div>;
    case props.embed.$type === "app.bsky.embed.recordWithMedia#view":
      return <div>This is a record with Media </div>;
    case props.embed.$type === "app.bsky.embed.video#view":
      return <div>This is a video </div>;
    default:
      return <div>Unknown embed</div>;
  }
};
