import {
  Column,
  Img,
  Link,
  Row,
  Section,
  Text as ReactEmailText,
} from "@react-email/components";
import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
  AtUri,
  RichText,
} from "@atproto/api";
import React, { type CSSProperties } from "react";
import {
  makeEmailIconUrl,
  renderTextWithBreaks,
  type EmailTheme,
  type ResolvedColors,
} from "./shared";

// Email rendering of a pub.leaflet.blocks.bskyPost block, mirroring the web's
// BskyPostContent/BskyEmbed with email-safe table markup. Embeds degrade:
// only the first image renders, video shows its thumbnail, quotes nest one
// level with text only — everything else links out to the post on Bluesky.

const BLOCK_MARGIN = "4px 0 16px";
const CONTENT_LABELS = ["porn", "sexual", "nudity", "graphic-media"];

type PostView = AppBskyFeedDefs.PostView;

type EmailCtx = {
  theme: EmailTheme;
  colors: ResolvedColors;
  assetsBaseUrl: string;
};

const labelsToInfo = (labels?: PostView["labels"]): string | undefined => {
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
};

const hasPwiOptOut = (author: {
  labels?: { val: string }[];
}): boolean =>
  !!author.labels?.some((label) => label.val === "!no-unauthenticated");

const bskyPostUrl = (
  clientHost: string,
  handle: string,
  uri: string,
): string => {
  let rkey: string;
  try {
    rkey = new AtUri(uri).rkey;
  } catch {
    rkey = uri.split("/").pop() ?? "";
  }
  return `https://${clientHost}/profile/${handle}/post/${rkey}`;
};

const formatPostDate = (createdAt: string): string | undefined => {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const BskyPostEmailBlock = ({
  post,
  clientHost = "bsky.app",
  theme,
  colors,
  assetsBaseUrl,
}: {
  post: PostView;
  clientHost?: string;
  theme: EmailTheme;
  colors: ResolvedColors;
  assetsBaseUrl: string;
}) => {
  const ctx: EmailCtx = { theme, colors, assetsBaseUrl };
  const record = post.record as AppBskyFeedPost.Record;
  const url = bskyPostUrl(clientHost, post.author.handle, post.uri);

  if (hasPwiOptOut(post.author)) {
    return (
      <Card colors={colors}>
        <ReactEmailText
          style={{
            color: colors.tertiary,
            fontFamily: theme.bodyFont,
            fontSize: 14,
            fontStyle: "italic",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          The author of this post has requested their posts not be displayed
          on external sites.
        </ReactEmailText>
        <ReactEmailText
          style={{ fontSize: 14, lineHeight: 1.4, margin: "4px 0 0" }}
        >
          <Link
            href={url}
            style={{
              color: theme.accentBackground,
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            See the full post on Bluesky
          </Link>
        </ReactEmailText>
      </Card>
    );
  }

  const labelInfo = labelsToInfo(post.labels);

  return (
    <Section style={{ margin: BLOCK_MARGIN, minWidth: "100%" }}>
      <Row
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          minWidth: "100%",
        }}
      >
        <Column style={{ padding: 12, verticalAlign: "top", width: 40 }}>
          <Link href={url} style={{ display: "block", textDecoration: "none" }}>
            <EmailAvatar
              src={post.author.avatar}
              alt={post.author.displayName || post.author.handle}
              size={40}
              colors={colors}
            />
          </Link>
        </Column>
        <Column
          style={{
            padding: "12px 12px 12px 0",
            verticalAlign: "top",
            wordBreak: "break-word",
          }}
        >
          <PostByline
            displayName={post.author.displayName}
            handle={post.author.handle}
            dateLabel={formatPostDate(record.createdAt)}
            url={url}
            ctx={ctx}
          />
          <BskyRichTextEmail record={record} ctx={ctx} />
          {post.embed ? (
            <EmbedRenderer
              embed={post.embed}
              labelInfo={labelInfo}
              postUrl={url}
              clientHost={clientHost}
              ctx={ctx}
            />
          ) : null}
          <PostCountsAndLink post={post} url={url} ctx={ctx} />
        </Column>
      </Row>
    </Section>
  );
};

const EmailAvatar = ({
  src,
  alt,
  size,
  colors,
}: {
  src?: string;
  alt: string;
  size: number;
  colors: ResolvedColors;
}) => {
  // Outlook renders the circle as a square — accepted template-wide.
  const style: CSSProperties = {
    borderRadius: "50%",
    display: "block",
    height: size,
    width: size,
  };
  if (!src) {
    return <div style={{ ...style, backgroundColor: colors.border }} />;
  }
  return <Img src={src} alt={alt} width={size} height={size} style={style} />;
};

const PostByline = ({
  displayName,
  handle,
  dateLabel,
  url,
  ctx,
}: {
  displayName?: string;
  handle: string;
  dateLabel?: string;
  url: string;
  ctx: EmailCtx;
}) => (
  <ReactEmailText
    style={{
      fontFamily: ctx.theme.bodyFont,
      fontSize: 14,
      lineHeight: 1.4,
      margin: 0,
    }}
  >
    <Link href={url} style={{ color: "inherit", textDecoration: "none" }}>
      <span style={{ color: ctx.colors.secondary, fontWeight: "bold" }}>
        {displayName?.trim() || handle}
      </span>
      {displayName?.trim() ? (
        <span style={{ color: ctx.colors.tertiary }}> @{handle}</span>
      ) : null}
      {dateLabel ? (
        <span style={{ color: ctx.colors.tertiary }}> · {dateLabel}</span>
      ) : null}
    </Link>
  </ReactEmailText>
);

// Port of BlueskyRichText: link/mention/tag facets become accent links,
// everything else is plain text with explicit <br /> line breaks.
const BskyRichTextEmail = ({
  record,
  ctx,
}: {
  record: AppBskyFeedPost.Record;
  ctx: EmailCtx;
}) => {
  if (!record.text) return null;
  const rt = new RichText({ text: record.text, facets: record.facets });
  const nodes: React.ReactNode[] = [];
  let i = 0;
  for (const segment of rt.segments()) {
    const key = `s${i++}`;
    let href: string | undefined;
    if (
      segment.link &&
      AppBskyRichtextFacet.validateLink(segment.link).success
    ) {
      href = segment.link.uri;
    } else if (
      segment.mention &&
      AppBskyRichtextFacet.validateMention(segment.mention).success
    ) {
      href = `https://bsky.app/profile/${segment.mention.did}`;
    } else if (
      segment.tag &&
      AppBskyRichtextFacet.validateTag(segment.tag).success
    ) {
      href = `https://bsky.app/tag/${segment.tag.tag}`;
    }
    const content = renderTextWithBreaks(segment.text, key);
    if (href) {
      nodes.push(
        <Link
          key={key}
          href={href}
          style={{
            color: ctx.theme.accentBackground,
            textDecoration: "none",
            wordBreak: "break-word",
          }}
        >
          {content}
        </Link>,
      );
    } else {
      nodes.push(<React.Fragment key={key}>{content}</React.Fragment>);
    }
  }
  return (
    <ReactEmailText
      style={{
        color: ctx.colors.secondary,
        fontFamily: ctx.theme.bodyFont,
        fontSize: 15,
        lineHeight: 1.4,
        margin: "4px 0 0",
      }}
    >
      {nodes}
    </ReactEmailText>
  );
};

const EmbedRenderer = ({
  embed,
  labelInfo,
  postUrl,
  clientHost,
  ctx,
}: {
  embed: NonNullable<PostView["embed"]>;
  labelInfo?: string;
  postUrl: string;
  clientHost: string;
  ctx: EmailCtx;
}) => {
  if (AppBskyEmbedImages.isView(embed)) {
    if (labelInfo) return <InfoBox ctx={ctx}>{labelInfo}</InfoBox>;
    return <ImagesEmbed images={embed.images} postUrl={postUrl} ctx={ctx} />;
  }

  if (AppBskyEmbedExternal.isView(embed)) {
    if (labelInfo) return <InfoBox ctx={ctx}>{labelInfo}</InfoBox>;
    return <ExternalEmbed external={embed.external} ctx={ctx} />;
  }

  if (AppBskyEmbedVideo.isView(embed)) {
    if (labelInfo) return <InfoBox ctx={ctx}>{labelInfo}</InfoBox>;
    return <VideoEmbed video={embed} postUrl={postUrl} ctx={ctx} />;
  }

  if (AppBskyEmbedRecord.isView(embed)) {
    return (
      <RecordEmbed
        record={embed.record}
        postUrl={postUrl}
        clientHost={clientHost}
        ctx={ctx}
      />
    );
  }

  if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    return (
      <>
        <EmbedRenderer
          embed={embed.media as NonNullable<PostView["embed"]>}
          labelInfo={labelInfo}
          postUrl={postUrl}
          clientHost={clientHost}
          ctx={ctx}
        />
        <RecordEmbed
          record={embed.record.record}
          postUrl={postUrl}
          clientHost={clientHost}
          ctx={ctx}
        />
      </>
    );
  }

  return <SeeFullPostCard postUrl={postUrl} ctx={ctx} />;
};

const RecordEmbed = ({
  record,
  postUrl,
  clientHost,
  ctx,
}: {
  record: AppBskyEmbedRecord.View["record"];
  postUrl: string;
  clientHost: string;
  ctx: EmailCtx;
}) => {
  if (AppBskyEmbedRecord.isViewRecord(record)) {
    return <QuoteEmbed record={record} clientHost={clientHost} ctx={ctx} />;
  }
  if (AppBskyEmbedRecord.isViewNotFound(record)) {
    return (
      <InfoBox ctx={ctx}>
        Quoted post not found, it may have been deleted.
      </InfoBox>
    );
  }
  if (AppBskyEmbedRecord.isViewBlocked(record)) {
    return <InfoBox ctx={ctx}>The quoted post is blocked.</InfoBox>;
  }
  if (AppBskyEmbedRecord.isViewDetached(record)) return null;
  // Starter packs, feeds, lists, labelers, and anything newer.
  return <SeeFullPostCard postUrl={postUrl} ctx={ctx} />;
};

const ImagesEmbed = ({
  images,
  postUrl,
  ctx,
}: {
  images: AppBskyEmbedImages.ViewImage[];
  postUrl: string;
  ctx: EmailCtx;
}) => {
  const first = images[0];
  if (!first) return null;
  const remaining = images.length - 1;
  return (
    <>
      <Link href={postUrl} style={{ display: "block" }}>
        <Img
          src={first.thumb}
          alt={first.alt}
          style={{
            borderRadius: 8,
            display: "block",
            height: "auto",
            marginTop: 8,
            maxWidth: "100%",
            width: "100%",
          }}
        />
      </Link>
      {remaining > 0 ? (
        <ReactEmailText
          style={{
            fontFamily: ctx.theme.bodyFont,
            fontSize: 14,
            lineHeight: 1.4,
            margin: "4px 0 0",
          }}
        >
          <Link
            href={postUrl}
            style={{
              color: ctx.theme.accentBackground,
              textDecoration: "none",
            }}
          >
            +{remaining} more — view on Bluesky
          </Link>
        </ReactEmailText>
      ) : null}
    </>
  );
};

const ExternalEmbed = ({
  external,
  ctx,
}: {
  external: AppBskyEmbedExternal.ViewExternal;
  ctx: EmailCtx;
}) => {
  const displayUrl = (() => {
    try {
      return new URL(external.uri).hostname;
    } catch {
      return external.uri;
    }
  })();
  const cellLinkStyle: CSSProperties = {
    color: "inherit",
    display: "block",
    textDecoration: "none",
  };
  return (
    <Section style={{ margin: "8px 0 0", minWidth: "100%" }}>
      <Row
        style={{
          border: `1px solid ${ctx.colors.borderLight}`,
          borderRadius: 8,
          minWidth: "100%",
        }}
      >
        <Column style={{ verticalAlign: "top", wordBreak: "break-word" }}>
          <Link
            href={external.uri}
            style={{ ...cellLinkStyle, padding: "8px 12px" }}
          >
            <span
              style={{
                color: ctx.theme.primary,
                display: "block",
                fontFamily: ctx.theme.bodyFont,
                fontWeight: "bold",
                fontSize: 14,
                wordBreak: "break-word",
              }}
            >
              {external.title || displayUrl}
            </span>
            {external.description ? (
              <span
                style={{
                  color: ctx.colors.secondary,
                  // 2-line clamp: -webkit-line-clamp works in Apple Mail /
                  // iOS / Gmail; Outlook ignores it but max-height +
                  // overflow still truncates (just without an ellipsis).
                  display: "-webkit-box",
                  fontFamily: ctx.theme.bodyFont,
                  fontSize: 14,
                  lineHeight: 1.4,
                  marginTop: 4,
                  maxHeight: "2.8em",
                  overflow: "hidden",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  wordBreak: "break-word",
                }}
              >
                {external.description}
              </span>
            ) : null}
            <span
              style={{
                color: ctx.theme.accentBackground,
                display: "block",
                fontFamily: ctx.theme.bodyFont,
                fontSize: 13,
                fontStyle: "italic",
                lineHeight: 1.4,
                marginTop: 4,
                wordBreak: "break-word",
              }}
            >
              {displayUrl}
            </span>
          </Link>
        </Column>
        {external.thumb ? (
          <Column style={{ verticalAlign: "top", width: 96 }}>
            <Link
              href={external.uri}
              style={{ ...cellLinkStyle, padding: "8px 8px 8px 0" }}
            >
              <Img
                src={external.thumb}
                alt=""
                style={{
                  borderRadius: 4,
                  display: "block",
                  height: 80,
                  objectFit: "cover",
                  width: "100%",
                }}
              />
            </Link>
          </Column>
        ) : null}
      </Row>
    </Section>
  );
};

const VideoEmbed = ({
  video,
  postUrl,
  ctx,
}: {
  video: AppBskyEmbedVideo.View;
  postUrl: string;
  ctx: EmailCtx;
}) => (
  <>
    {video.thumbnail ? (
      <Link href={postUrl} style={{ display: "block" }}>
        <Img
          src={video.thumbnail}
          alt={video.alt ?? ""}
          style={{
            borderRadius: 8,
            display: "block",
            height: "auto",
            marginTop: 8,
            maxWidth: "100%",
            width: "100%",
          }}
        />
      </Link>
    ) : null}
    <ReactEmailText
      style={{
        fontFamily: ctx.theme.bodyFont,
        fontSize: 14,
        lineHeight: 1.4,
        margin: "4px 0 0",
      }}
    >
      <Link
        href={postUrl}
        style={{
          color: ctx.theme.accentBackground,
          fontWeight: "bold",
          textDecoration: "none",
        }}
      >
        ▶ Watch on Bluesky
      </Link>
    </ReactEmailText>
  </>
);

const QuoteEmbed = ({
  record,
  clientHost,
  ctx,
}: {
  record: AppBskyEmbedRecord.ViewRecord;
  clientHost: string;
  ctx: EmailCtx;
}) => {
  if (hasPwiOptOut(record.author)) {
    return (
      <InfoBox ctx={ctx}>
        The author of the quoted post has requested their posts not be
        displayed on external sites.
      </InfoBox>
    );
  }

  const url = bskyPostUrl(clientHost, record.author.handle, record.uri);
  const text = AppBskyFeedPost.isRecord(record.value)
    ? (record.value as AppBskyFeedPost.Record).text
    : undefined;
  // Blur isn't possible in email, so a content-labeled quoted author just
  // gets no avatar.
  const isAuthorLabeled = record.author.labels?.some((label) =>
    CONTENT_LABELS.includes(label.val),
  );
  const hasMedia = !!record.embeds?.length;

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ marginTop: 8, minWidth: "100%", width: "100%" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              border: `1px solid ${ctx.colors.borderLight}`,
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <Link
              href={url}
              style={{
                color: "inherit",
                display: "block",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  color: ctx.colors.secondary,
                  display: "block",
                  fontFamily: ctx.theme.bodyFont,
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {!isAuthorLabeled && record.author.avatar ? (
                  <Img
                    src={record.author.avatar}
                    alt=""
                    width={16}
                    height={16}
                    style={{
                      borderRadius: "50%",
                      display: "inline-block",
                      marginRight: 6,
                      verticalAlign: "middle",
                    }}
                  />
                ) : null}
                <span style={{ fontWeight: "bold" }}>
                  {record.author.displayName?.trim() || record.author.handle}
                </span>{" "}
                <span style={{ color: ctx.colors.tertiary }}>
                  @{record.author.handle}
                </span>
              </span>
              {text ? (
                <span
                  style={{
                    color: ctx.colors.secondary,
                    display: "block",
                    fontFamily: ctx.theme.bodyFont,
                    fontSize: 14,
                    lineHeight: 1.4,
                    marginTop: 4,
                    wordBreak: "break-word",
                  }}
                >
                  {renderTextWithBreaks(text, "quote")}
                </span>
              ) : null}
              {hasMedia ? (
                <span
                  style={{
                    color: ctx.theme.accentBackground,
                    display: "block",
                    fontFamily: ctx.theme.bodyFont,
                    fontSize: 13,
                    fontStyle: "italic",
                    marginTop: 4,
                  }}
                >
                  View media on Bluesky
                </span>
              ) : null}
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

const PostCountsAndLink = ({
  post,
  url,
  ctx,
}: {
  post: PostView;
  url: string;
  ctx: EmailCtx;
}) => {
  const countStyle: CSSProperties = {
    color: ctx.colors.tertiary,
    fontFamily: ctx.theme.bodyFont,
    fontSize: 13,
    textDecoration: "none",
  };
  const countIcon = (name: "comment" | "quote") => (
    <Img
      src={makeEmailIconUrl(ctx.assetsBaseUrl, name, ctx.colors.tertiary, 14)}
      width={14}
      height={14}
      alt=""
      style={{
        display: "inline-block",
        marginRight: 4,
        verticalAlign: "middle",
      }}
    />
  );
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ marginTop: 8, minWidth: "100%", width: "100%" }}
    >
      <tbody>
        <tr>
          <td style={{ verticalAlign: "middle" }}>
            {post.replyCount ? (
              <Link href={url} style={{ ...countStyle, marginRight: 12 }}>
                {countIcon("comment")}
                <span style={{ verticalAlign: "middle" }}>
                  {post.replyCount}
                </span>
              </Link>
            ) : null}
            {post.quoteCount ? (
              <Link href={url} style={countStyle}>
                {countIcon("quote")}
                <span style={{ verticalAlign: "middle" }}>
                  {post.quoteCount}
                </span>
              </Link>
            ) : null}
          </td>
          <td align="right" style={{ verticalAlign: "middle", width: 20 }}>
            <Link href={url} style={{ display: "block" }}>
              <Img
                src={makeEmailIconUrl(
                  ctx.assetsBaseUrl,
                  "bluesky",
                  ctx.colors.tertiary,
                )}
                width={16}
                height={16}
                alt="See on Bluesky"
                style={{ display: "block" }}
              />
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

const InfoBox = ({
  children,
  ctx,
}: {
  children: React.ReactNode;
  ctx: EmailCtx;
}) => (
  <table
    role="presentation"
    width="100%"
    cellPadding={0}
    cellSpacing={0}
    border={0}
    style={{ marginTop: 8, minWidth: "100%", width: "100%" }}
  >
    <tbody>
      <tr>
        <td
          style={{
            border: `1px solid ${ctx.colors.borderLight}`,
            borderRadius: 8,
            color: ctx.colors.tertiary,
            fontFamily: ctx.theme.bodyFont,
            fontSize: 14,
            fontStyle: "italic",
            lineHeight: 1.4,
            padding: "8px 10px",
          }}
        >
          {children}
        </td>
      </tr>
    </tbody>
  </table>
);

const SeeFullPostCard = ({
  postUrl,
  ctx,
}: {
  postUrl: string;
  ctx: EmailCtx;
}) => (
  <table
    role="presentation"
    width="100%"
    cellPadding={0}
    cellSpacing={0}
    border={0}
    style={{ marginTop: 8, minWidth: "100%", width: "100%" }}
  >
    <tbody>
      <tr>
        <td
          align="center"
          style={{
            backgroundColor: ctx.colors.borderLight,
            borderRadius: 4,
            padding: "12px 10px",
          }}
        >
          <span
            style={{
              color: ctx.colors.tertiary,
              display: "block",
              fontFamily: ctx.theme.bodyFont,
              fontSize: 14,
              fontStyle: "italic",
              lineHeight: 1.4,
            }}
          >
            This media isn&apos;t supported in email...
          </span>
          <Link
            href={postUrl}
            style={{
              color: ctx.theme.accentBackground,
              display: "block",
              fontFamily: ctx.theme.bodyFont,
              fontSize: 14,
              fontWeight: "bold",
              lineHeight: 1.4,
              marginTop: 4,
              textDecoration: "none",
            }}
          >
            See the full post on Bluesky
          </Link>
        </td>
      </tr>
    </tbody>
  </table>
);

// Bordered wrapper for the whole-card fallback states (pwi opt-out).
const Card = ({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ResolvedColors;
}) => (
  <Section style={{ margin: BLOCK_MARGIN, minWidth: "100%" }}>
    <Row
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        minWidth: "100%",
      }}
    >
      <Column style={{ padding: 12 }}>{children}</Column>
    </Row>
  </Section>
);
