import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyGraphDefs,
  AppBskyGraphStarterpack,
  AppBskyLabelerDefs,
  AtUri,
} from "@atproto/api";
import { useMemo } from "react";
import { Avatar } from "components/Avatar";
import { LocalizedDate } from "app/(app)/lish/[did]/[publication]/LocalizedDate";
import { BlueskyVideoPlayer } from "./BlueskyVideoPlayer";
import { PubIcon } from "components/ActionBar/Publications";
import { getProfiles } from "src/identity";
import { useRecordFromDid } from "src/utils/useRecordFromDid";

// A fork of bluesky's embed renderer, matching its layout while using our
// colors, fonts, and shared components (Avatar, BlueskyVideoPlayer). Context
// free so it can render in both the reader (BlueskyEmbed) and the compose card:
// the reader passes onQuoteClick to open the in-app thread drawer, while the
// composer omits it so quotes link out to bluesky.
// https://github.com/bluesky-social/social-app/blob/main/bskyembed/src/components/embed.tsx
export function BskyEmbed({
  content,
  labels,
  hideRecord,
  compact,
  postUrl,
  className,
  onQuoteClick,
}: {
  content: AppBskyFeedDefs.PostView["embed"];
  labels?: AppBskyFeedDefs.PostView["labels"];
  hideRecord?: boolean;
  compact?: boolean;
  postUrl?: string;
  className?: string;
  // When set, quoted posts open the in-app thread drawer instead of linking to
  // bluesky. The reader wires this up; the composer preview leaves it undefined.
  onQuoteClick?: (uri: string) => void;
}) {
  const labelInfo = useMemo(() => labelsToInfo(labels), [labels]);

  // Cases bluesky can't render inline: link out to the full post when we have a
  // url (reader), otherwise show nothing (composer preview).
  const unsupported = () =>
    postUrl ? <SeePostOnBluesky postUrl={postUrl} /> : null;

  if (!content) return null;

  try {
    // Case 1: Image
    if (AppBskyEmbedImages.isView(content)) {
      if (labelInfo) return <Info>{labelInfo}</Info>;
      return (
        <ImageGrid
          images={content.images.map((i) => ({ thumb: i.thumb, alt: i.alt }))}
        />
      );
    }

    // Case 2: External link
    if (AppBskyEmbedExternal.isView(content)) {
      return (
        <ExternalEmbed
          content={content}
          labelInfo={labelInfo}
          compact={compact}
          className={className}
        />
      );
    }

    // Case 3: Record (quote or linked post)
    if (AppBskyEmbedRecord.isView(content)) {
      if (hideRecord) return null;

      const record = content.record;

      // Case 3.1: Post
      if (AppBskyEmbedRecord.isViewRecord(record)) {
        const pwiOptOut = !!record.author.labels?.find(
          (label) => label.val === "!no-unauthenticated",
        );
        if (pwiOptOut) {
          return (
            <Info>
              The author of the quoted post has requested their posts not be
              displayed on external sites.
            </Info>
          );
        }

        let text: string | undefined;
        if (AppBskyFeedPost.isRecord(record.value)) {
          text = (record.value as AppBskyFeedPost.Record).text;
        }

        const isAuthorLabeled = record.author.labels?.some((label) =>
          CONTENT_LABELS.includes(label.val),
        );

        const inner = (
          <>
            <div className="flex gap-1.5 items-center">
              <div
                className="shrink-0"
                style={isAuthorLabeled ? { filter: "blur(1.5px)" } : undefined}
              >
                <Avatar
                  src={record.author.avatar}
                  displayName={record.author.displayName}
                  size="tiny"
                />
              </div>
              <div className="flex flex-1 items-center shrink min-w-0 min-h-0">
                <p className="text-sm shrink-0 font-bold max-w-[70%] truncate">
                  {record.author.displayName?.trim() || record.author.handle}
                </p>
                <p className="text-sm text-tertiary min-w-0 truncate ml-1">
                  @{record.author.handle}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1 ml-5">
              {text && (
                <p
                  className={`text-sm leading-snug ${compact ? "line-clamp-3" : ""}`}
                >
                  {text}
                </p>
              )}
              {!compact &&
                record.embeds?.map((embed) => (
                  <>
                    <BskyEmbed
                      key={embed.$type as string}
                      content={embed as AppBskyFeedDefs.PostView["embed"]}
                      labels={record.labels}
                      hideRecord
                    />
                    <div className="spacer w-full h-1" />
                  </>
                ))}
            </div>
          </>
        );

        const quoteClassName = `transition-colors hover:border-accent-contrast border border-border-light rounded-lg py-2 p-3 gap-0.5 w-full flex flex-col text-left  ${className || ""}`;

        if (onQuoteClick) {
          return (
            <button
              type="button"
              className={quoteClassName}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuoteClick(record.uri);
              }}
            >
              {inner}
            </button>
          );
        }
        return (
          <Link
            href={`/profile/${record.author.did}/post/${getRkey(record.uri)}`}
            className={quoteClassName}
          >
            {inner}
          </Link>
        );
      }

      // Case 3.2: List
      if (AppBskyGraphDefs.isListView(record)) {
        return (
          <GenericWithImageEmbed
            image={record.avatar}
            title={record.name}
            href={`/profile/${record.creator.did}/lists/${getRkey(record.uri)}`}
            subtitle={
              record.purpose === AppBskyGraphDefs.MODLIST
                ? `Moderation list by @${record.creator.handle}`
                : `User list by @${record.creator.handle}`
            }
            description={record.description}
          />
        );
      }

      // Case 3.3: Feed
      if (AppBskyFeedDefs.isGeneratorView(record)) {
        return (
          <GenericWithImageEmbed
            image={record.avatar}
            title={record.displayName}
            href={`/profile/${record.creator.did}/feed/${getRkey(record.uri)}`}
            subtitle={`Feed by @${record.creator.handle}`}
            description={`Liked by ${record.likeCount ?? 0} users`}
          />
        );
      }

      // Case 3.4: Labeler — embed type does not exist in the app
      if (AppBskyLabelerDefs.isLabelerView(record)) return unsupported();

      // Case 3.5: Starter pack
      if (AppBskyGraphDefs.isStarterPackViewBasic(record)) {
        return <StarterPackEmbed content={record} />;
      }

      // Case 3.6: Post not found
      if (AppBskyEmbedRecord.isViewNotFound(record)) {
        return <Info>Quoted post not found, it may have been deleted.</Info>;
      }

      // Case 3.7: Post blocked
      if (AppBskyEmbedRecord.isViewBlocked(record)) {
        return <Info>The quoted post is blocked.</Info>;
      }

      // Case 3.8: Detached quote post — show nothing
      if (AppBskyEmbedRecord.isViewDetached(record)) return null;

      return unsupported();
    }

    // Case 4: Video
    if (AppBskyEmbedVideo.isView(content)) {
      return <VideoEmbed content={content} className={className} />;
    }

    // Case 5: Record with media
    if (
      AppBskyEmbedRecordWithMedia.isView(content) &&
      AppBskyEmbedRecord.isViewRecord(content.record.record)
    ) {
      return (
        <div className="flex flex-col gap-2">
          <BskyEmbed
            content={content.media as AppBskyFeedDefs.PostView["embed"]}
            labels={labels}
            hideRecord={hideRecord}
            compact={compact}
            postUrl={postUrl}
            className={className}
            onQuoteClick={onQuoteClick}
          />
          <BskyEmbed
            content={{
              $type: "app.bsky.embed.record#view",
              record: content.record.record,
            }}
            labels={content.record.record.labels}
            hideRecord={hideRecord}
            compact={compact}
            postUrl={postUrl}
            className={className}
            onQuoteClick={onQuoteClick}
          />
        </div>
      );
    }

    // Unknown embed type
    return unsupported();
  } catch (err) {
    return (
      <Info>{err instanceof Error ? err.message : "An error occurred"}</Info>
    );
  }
}

function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-lg border border-border-light py-2 px-2.5 flex-row flex gap-2">
      <InfoIcon className="w-4 h-4 shrink-0 mt-0.5 text-tertiary" />
      <p className="text-sm text-tertiary">{children}</p>
    </div>
  );
}

type GridImage = { thumb: string; alt: string };

function ImageGrid({ images }: { images: GridImage[] }) {
  switch (images.length) {
    case 0:
      return null;
    case 1:
      return (
        <img
          src={images[0].thumb}
          alt={images[0].alt}
          className="w-full rounded-lg overflow-hidden object-cover h-auto max-h-[1000px]"
        />
      );
    case 2:
      return (
        <div className="flex gap-1 rounded-lg overflow-hidden w-full aspect-[2/1]">
          {images.map((image, i) => (
            <img
              key={i}
              src={image.thumb}
              alt={image.alt}
              className="w-1/2 h-full object-cover rounded-sm"
            />
          ))}
        </div>
      );
    case 3:
      return (
        <div className="flex gap-1 rounded-lg overflow-hidden w-full aspect-[2/1]">
          <div className="flex-1 aspect-square">
            <img
              src={images[0].thumb}
              alt={images[0].alt}
              className="w-full h-full object-cover rounded-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            {images.slice(1).map((image, i) => (
              <img
                key={i}
                src={image.thumb}
                alt={image.alt}
                className="flex-1 object-cover rounded-sm min-h-0"
              />
            ))}
          </div>
        </div>
      );
    default: {
      const remaining = images.length - 4;
      return (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {images.slice(0, 4).map((image, i) => {
            const isOverflowCell = i === 3 && remaining > 0;
            return (
              <div
                key={i}
                className="relative aspect-[3/2] rounded-sm overflow-hidden"
              >
                <img
                  src={image.thumb}
                  alt={image.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isOverflowCell && (
                  <div
                    aria-label={`+${remaining} more image${remaining === 1 ? "" : "s"}, view post to see all`}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <span className="text-white text-2xl font-bold">
                      +{remaining}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  }
}

function ExternalEmbed({
  content,
  labelInfo,
  compact,
  className,
}: {
  content: AppBskyEmbedExternal.View;
  labelInfo?: string;
  compact?: boolean;
  className?: string;
}) {
  if (labelInfo) return <Info>{labelInfo}</Info>;
  const external = content.external as StandardSiteExternal;
  if (external.source && isStandardSiteEmbed(external)) {
    return (
      <StandardSiteExternalEmbed
        external={external}
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <Link
      href={content.external.uri}
      className={`w-full rounded-lg overflow-hidden border border-border-light hover:no-underline hover:border-accent-contrast ${compact ? "flex items-stretch" : "flex flex-col items-stretch"} ${className || ""}`}
      disableTracking
    >
      {content.external.thumb &&
        (compact ? (
          <div className="aspect-square h-[113px] shrink-0 hidden sm:block">
            <img
              src={content.external.thumb}
              alt={content.external.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <img
            src={content.external.thumb}
            alt={content.external.title}
            className="aspect-[1200/630] object-cover"
          />
        ))}
      <div
        className={`min-w-0 flex flex-col ${compact ? "py-2 px-3 " : "py-2 px-2.5"}`}
      >
        <p
          className={`font-bold leading-tight ${compact ? "truncate" : "line-clamp-3"}`}
        >
          {content.external.title}
        </p>
        <p className="text-sm leading-snug text-tertiary line-clamp-2 mt-0.5">
          {content.external.description}
        </p>
        <div className="grow flex items-end">
          <div className="flex flex-row items-center gap-1 border-t border-border-light mt-2 pt-1.5 w-full">
            <Globe size={12} className="text-tertiary" />
            <p className="text-xs leading-none text-tertiary line-clamp-1">
              {toNiceDomain(content.external.uri)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// The standard.site card: the article's thumb/title/description linking to the
// post, footered with the publication (icon + name + author) linking to the
// publication instead of the article's bare domain.
export function StandardSiteExternalEmbed({
  external,
  compact,
  className,
}: {
  external: StandardSiteExternal;
  compact?: boolean;
  className?: string;
}) {
  const source = external.source!;
  // The author is the did that owns the site.standard.document ref, matched to
  // one of the associated profiles.
  const authorDid = external.associatedRefs
    ?.filter((ref) =>
      atCollection(ref.uri).startsWith("site.standard.document"),
    )
    .map((ref) => atHost(ref.uri))
    .find(Boolean);

  const { data: profile } = useRecordFromDid(authorDid);
  const handle = profile?.handle;

  return (
    <div
      className={`w-full rounded-lg overflow-hidden border border-border-light flex flex-col items-stretch ${className || ""}`}
    >
      <Link
        href={external.uri}
        className="flex flex-col hover:no-underline"
        disableTracking
      >
        {external.thumb && !compact && (
          <img
            src={external.thumb}
            alt={external.title}
            className="aspect-[1200/630] object-cover border-b border-border-light"
          />
        )}
        <div className="min-w-0 flex flex-col py-2 px-2.5">
          <p className="font-bold leading-tight line-clamp-3">
            {external.title}
          </p>
          {external.description && (
            <p className="text-sm leading-snug text-tertiary line-clamp-2 mt-0.5">
              {external.description}
            </p>
          )}
          {external.createdAt && (
            <p className="text-xs leading-snug text-tertiary mt-1">
              <LocalizedDate
                dateString={external.createdAt}
                options={{ year: "numeric", month: "long", day: "2-digit" }}
              />
            </p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t border-border-light py-2 px-2.5">
        <Link
          href={source.uri || external.uri}
          className="flex items-center gap-2 min-w-0 grow hover:no-underline"
          disableTracking
        >
          <PubIcon
            icon={source.icon}
            pubName={source.title}
            className="rounded-md! w-8! h-8!"
          />

          <div className="flex flex-col leading-tight  min-w-0">
            <span className="text-sm font-semibold text-secondary truncate">
              {source.title}
            </span>
            {handle && (
              <span className="text-xs text-tertiary truncate shrink-0">
                by @{handle}
              </span>
            )}
          </div>
        </Link>
        <Link
          href={source.uri || external.uri}
          className="shrink-0 bg-accent-1 text-accent-2 border border-accent-1 rounded-full px-2 py-0.5 text-sm font-bold hover:no-underline"
        >
          Subscribe
        </Link>
      </div>
    </div>
  );
}

function GenericWithImageEmbed({
  title,
  subtitle,
  href,
  image,
  description,
}: {
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="w-full rounded-lg border border-border-light py-2 px-3 flex flex-col gap-2 hover:no-underline hover:border-accent-contrast"
    >
      <div className="flex gap-2.5 items-center">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-10 h-10 rounded-md bg-border shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-border shrink-0" />
        )}
        <div className="flex-1">
          <p className="font-bold leading-snug text-sm">{title}</p>
          <p className="text-tertiary leading-snug text-xs">{subtitle}</p>
        </div>
      </div>
      {description && <p className="text-tertiary text-sm">{description}</p>}
    </Link>
  );
}

function VideoEmbed({
  content,
  className,
}: {
  content: AppBskyEmbedVideo.View;
  className?: string;
}) {
  let aspectRatio = 1;
  if (content.aspectRatio) {
    const { width, height } = content.aspectRatio;
    aspectRatio = clamp(width / height, 1 / 1, 3 / 1);
  }
  return (
    <BlueskyVideoPlayer
      playlist={content.playlist}
      thumbnail={content.thumbnail}
      alt={content.alt}
      aspectRatio={aspectRatio}
      className={className}
    />
  );
}

function StarterPackEmbed({
  content,
}: {
  content: AppBskyGraphDefs.StarterPackViewBasic;
}) {
  if (!AppBskyGraphStarterpack.isRecord(content.record)) return null;
  const record = content.record as AppBskyGraphStarterpack.Record;

  const rkey = getRkey(content.uri);
  const handleOrDid = content.creator.handle || content.creator.did;
  const starterPackHref = `/starter-pack/${handleOrDid}/${rkey}`;
  const imageUri = `https://ogcard.cdn.bsky.app/start/${content.creator.did}/${rkey}`;

  return (
    <Link
      href={starterPackHref}
      className="w-full rounded-lg overflow-hidden border border-border-light flex flex-col items-stretch hover:no-underline hover:border-accent-contrast"
    >
      <img src={imageUri} className="aspect-[1200/630] object-cover" />
      <div className="px-3 py-2">
        <div className="flex space-x-2 items-center">
          <div className="w-10 h-10 rounded-md bg-border shrink-0" />
          <div>
            <p className="font-bold leading-snug">{record.name}</p>
            <p className="text-xs text-tertiary line-clamp-2 leading-snug">
              Starter pack by{" "}
              {content.creator.displayName || `@${content.creator.handle}`}
            </p>
          </div>
        </div>
        {record.description && (
          <p className="text-sm text-tertiary mt-1.5">{record.description}</p>
        )}
        {!!content.joinedAllTimeCount && content.joinedAllTimeCount > 50 && (
          <p className="text-sm font-bold text-tertiary mt-0.5">
            {content.joinedAllTimeCount} users have joined!
          </p>
        )}
      </div>
    </Link>
  );
}

const SeePostOnBluesky = (props: { postUrl: string | undefined }) => {
  return (
    <a
      href={props.postUrl}
      target="_blank"
      className={`block-border flex flex-col p-3 font-normal rounded-md! border text-tertiary italic text-center hover:no-underline hover:border-accent-contrast ${props.postUrl === undefined && "pointer-events-none"}`}
    >
      <div> This media is not supported… </div>{" "}
      {props.postUrl === undefined ? null : (
        <div>
          See the <span className="text-accent-contrast">full post</span> on
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

// A link into bluesky — relative hrefs resolve against bsky.app and open in a
// new tab so clicking never disrupts the surrounding page.
function Link({
  href,
  className,
  disableTracking,
  children,
  ...props
}: {
  href: string;
  disableTracking?: boolean;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const url = href.startsWith("http") ? href : `https://bsky.app${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer ${className || ""}`}
      {...props}
    >
      {children}
    </a>
  );
}

function toNiceDomain(url: string): string {
  try {
    const urlp = new URL(url);
    return urlp.host ? urlp.host : url;
  } catch (e) {
    return url;
  }
}

function getRkey(uri: string): string {
  return new AtUri(uri).rkey;
}

// standard.site (leaflet.pub etc.) augments the external embed with refs to the
// underlying site.standard.* records, the author profiles, and the publication.
// These aren't in the published @atproto/api types yet, so widen locally.
type StandardSiteExternal = AppBskyEmbedExternal.ViewExternal & {
  associatedRefs?: { uri: string; cid?: string }[];
  associatedProfiles?: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  }[];
  source?: { uri?: string; title?: string; icon?: string };
  createdAt?: string;
};

function atCollection(uri: string): string {
  try {
    return new AtUri(uri).collection;
  } catch {
    return "";
  }
}

function atHost(uri: string): string {
  try {
    return new AtUri(uri).host;
  } catch {
    return "";
  }
}

function isStandardSiteEmbed(external: StandardSiteExternal): boolean {
  return !!external.associatedRefs?.some((ref) =>
    atCollection(ref.uri).startsWith("site.standard."),
  );
}

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

const CONTENT_LABELS = ["porn", "sexual", "nudity", "graphic-media"];

function labelsToInfo(
  labels?: AppBskyFeedDefs.PostView["labels"],
): string | undefined {
  const label = labels?.find((label) => CONTENT_LABELS.includes(label.val));
  switch (label?.val) {
    case "porn":
    case "sexual":
      return "Adult Content";
    case "nudity":
      return "Non-sexual Nudity";
    case "gore":
    case "graphic-media":
      return "Graphic Media";
    default:
      return undefined;
  }
}

const Globe = ({
  size = 14,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M4.4 9.493C4.14 10.28 4 11.124 4 12a8 8 0 1 0 10.899-7.459l-.953 3.81a1 1 0 0 1-.726.727l-3.444.866-.772 1.533a1 1 0 0 1-1.493.35L4.4 9.493Zm.883-1.84L7.756 9.51l.44-.874a1 1 0 0 1 .649-.52l3.306-.832.807-3.227a7.99 7.99 0 0 0-7.676 3.597ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm8.43.162a1 1 0 0 1 .77-.29l1.89.121a1 1 0 0 1 .494.168l2.869 1.928a1 1 0 0 1 .336 1.277l-.973 1.946a1 1 0 0 1-.894.553h-2.92a1 1 0 0 1-.831-.445L9.225 14.5a1 1 0 0 1 .126-1.262l1.08-1.076Zm.915 1.913.177-.177 1.171.074 1.914 1.286-.303.607h-1.766l-1.194-1.79Z"
      clipRule="evenodd"
    />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm10-5a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 8a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12Z"
      clipRule="evenodd"
    />
  </svg>
);
