import { Column, Img, Link, Row, Section } from "@react-email/components";
import { AtUri } from "@atproto/syntax";
import React, { type CSSProperties } from "react";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import type { StandardSitePublicationData } from "app/api/rpc/[command]/get_standard_site_publications";
import {
  getDocumentURL,
  getPublicationURL,
} from "app/(app)/lish/createPub/getPublicationURL";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import { formatBylineNames } from "src/utils/byline";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { resolveEmailTheme } from "./fromPublication";
import {
  bgcolorAttr,
  pickAccentContrast,
  resolveColors,
  type EmailTheme,
  type ResolvedColors,
} from "./shared";

const BLOCK_MARGIN = "4px 0 16px";
const CARD_RADIUS = 8;
// The web medium item's desktop cover thumbnail (`sm:w-48`); email clients
// can't switch to the 96px mobile variant, so the desktop size is used
// everywhere.
const MEDIUM_COVER_SIZE = 192;

// getDocumentURL/getPublicationURL can return a leading-slash path when the
// referenced publication has no configured URL; mail clients have no base to
// resolve against, so absolutize against the app origin.
const absolutize = (url: string, assetsBaseUrl: string): string => {
  try {
    return new URL(url, assetsBaseUrl).toString();
  } catch {
    return url;
  }
};

type ThemeSource =
  | Parameters<typeof resolvePublicationTheme>[0]
  | null
  | undefined;

// The surface visible behind blocks in the outer email — mirrors how the web
// card inherits the surrounding theme's `bg-page` when it isn't themed itself.
const outerCardTheme = (theme: EmailTheme): EmailTheme => ({
  ...theme,
  pageBackground: theme.showPageBackground
    ? theme.pageBackground
    : theme.backgroundColor,
  showPageBackground: true,
});

// Email analog of PublicationThemeWrapper + usePubTheme + BaseThemeProvider's
// surface collapse: resolve the first source that defines a theme (full or
// basicTheme) into an EmailTheme whose `pageBackground` is the card surface.
// Mirrors the web's chain exactly: bgPage falls back to white for standalone
// posts / the leaflet background otherwise when the theme doesn't set one,
// and the surface collapses to the leaflet background entirely when the
// theme doesn't show a page background (`showPageBackground` defaults false
// for publication sources, true for standalone).
const resolveCardTheme = (
  sources: ThemeSource[],
  isStandalone: boolean,
): EmailTheme => {
  const source = sources.find((s) => s?.theme || s?.basicTheme);
  const resolved = resolvePublicationTheme(source);
  const t = resolveEmailTheme(resolved);
  const showPageBackground = isStandalone
    ? resolved?.showPageBackground !== false
    : !!resolved?.showPageBackground;
  const bgPage = resolved?.pageBackground
    ? t.pageBackground
    : isStandalone
      ? "rgb(255, 255, 255)"
      : t.backgroundColor;
  return {
    ...t,
    pageBackground: showPageBackground ? bgPage : t.backgroundColor,
    showPageBackground: true,
  };
};

// Block-level anchor that makes a whole card region clickable while staying
// table-friendly for Outlook (which dislikes <a> wrapping <table>).
const cellLinkStyle: CSSProperties = {
  color: "inherit",
  display: "block",
  textDecoration: "none",
};

// The web's `block-border` sits *outside* the theme wrapper, so the border
// tint derives from the surrounding (email) theme, not the card's own.
const cardTableStyle = (
  borderColor: string,
  cardBg: string,
): CSSProperties => ({
  backgroundColor: cardBg,
  border: `1px solid ${borderColor}`,
  borderCollapse: "separate",
  borderRadius: CARD_RADIUS,
  width: "100%",
});

const PubInfoLine = ({
  name,
  url,
  iconSrc,
  nameColor,
  theme,
}: {
  name: string;
  url: string;
  iconSrc?: string;
  nameColor: string;
  theme: EmailTheme;
}) => (
  <Link
    href={url}
    style={{
      color: nameColor,
      display: "block",
      fontFamily: theme.bodyFont,
      fontSize: 14,
      fontWeight: "bold",
      lineHeight: 1.4,
      marginBottom: 4,
      textDecoration: "none",
    }}
  >
    {iconSrc ? (
      <Img
        src={iconSrc}
        width={12}
        height={12}
        alt=""
        style={{
          borderRadius: 6,
          display: "inline-block",
          marginRight: 6,
          verticalAlign: "middle",
        }}
      />
    ) : (
      // PubIcon's letter fallback, at the web's 12px `tiny` size.
      <span
        style={{
          backgroundColor: theme.accentBackground,
          borderRadius: 6,
          color: theme.accentText,
          display: "inline-block",
          fontSize: 9,
          fontWeight: "bold",
          height: 12,
          lineHeight: "12px",
          marginRight: 6,
          textAlign: "center",
          verticalAlign: "middle",
          width: 12,
        }}
      >
        {name ? name.slice(0, 1).toUpperCase() : "P"}
      </span>
    )}
    <span style={{ verticalAlign: "middle" }}>{name}</span>
  </Link>
);

const MetaLine = ({
  author,
  date,
  colors,
  bodyFont,
}: {
  author?: string;
  date?: string;
  colors: ResolvedColors;
  bodyFont: string;
}) => {
  const label = [author, date].filter(Boolean).join(" | ");
  if (!label) return null;
  return (
    <span
      style={{
        color: colors.tertiary,
        display: "block",
        fontFamily: bodyFont,
        fontSize: 14,
        lineHeight: 1.4,
        marginTop: 8,
      }}
    >
      {label}
    </span>
  );
};

// 3-line clamp matching the web items' `line-clamp-3`. -webkit-line-clamp
// works in Apple Mail / iOS / Gmail; Outlook ignores it but max-height +
// overflow still truncates (just without an ellipsis).
const descriptionStyle = (
  colors: ResolvedColors,
  bodyFont: string,
  fontSize: number,
): CSSProperties => ({
  color: colors.secondary,
  display: "-webkit-box",
  fontFamily: bodyFont,
  fontSize,
  lineHeight: 1.4,
  marginTop: 4,
  maxHeight: "4.2em",
  overflow: "hidden",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 3,
  wordBreak: "break-word",
});

const bylineLabel = (p: {
  displayName: string | null;
  handle: string | null;
}) => p.displayName || p.handle || undefined;

export type StandardSitePostEmailSize = "large" | "medium" | "small";

export const StandardSitePostEmailBlock = ({
  post,
  size,
  showPublicationTheme,
  currentPublicationUri,
  theme,
  assetsBaseUrl,
}: {
  post: StandardSitePostData;
  size: StandardSitePostEmailSize;
  showPublicationTheme: boolean;
  currentPublicationUri?: string;
  theme: EmailTheme;
  assetsBaseUrl: string;
}) => {
  // Mirror PublicationThemeWrapper's source order: the referenced post's
  // publication theme, else the post's own theme; standalone (no publication)
  // flips usePubTheme to standalone defaults.
  const cardTheme = showPublicationTheme
    ? resolveCardTheme([post.publication?.record, post.record], !post.publication)
    : outerCardTheme(theme);
  const colors = resolveColors(cardTheme);
  const cardBg = cardTheme.pageBackground;
  const borderColor = resolveColors(theme).borderLight;

  const docUrl = absolutize(
    getDocumentURL(post.record, post.uri, post.publication ?? undefined),
    assetsBaseUrl,
  );
  const authorLabel =
    post.contributors.length > 0
      ? formatBylineNames(
          post.contributors
            .map(bylineLabel)
            .filter((l): l is string => !!l),
        ) || undefined
      : bylineLabel(post.author ?? { displayName: null, handle: null });
  // Same Intl options as the web's LocalizedDate; UTC matches its SSR default
  // (an email can't localize to the reader's timezone).
  const dateLabel = post.record.publishedAt
    ? new Date(post.record.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
        timeZone: "UTC",
      })
    : undefined;
  const description =
    post.record.description || getFirstParagraph(post.record);

  let postDid: string | undefined;
  try {
    postDid = new AtUri(post.uri).host;
  } catch {
    postDid = undefined;
  }
  const coverImageSrc =
    post.record.coverImage && postDid
      ? blobRefToSrc(post.record.coverImage.ref, postDid, assetsBaseUrl, {
          width:
            size === "large"
              ? COVER_THUMBNAIL_WIDTH.large
              : COVER_THUMBNAIL_WIDTH.medium,
        })
      : undefined;

  let pubDid: string | undefined;
  try {
    pubDid = post.publication ? new AtUri(post.publication.uri).host : undefined;
  } catch {
    pubDid = undefined;
  }
  const showPubInfo =
    !!post.publication?.record &&
    (!currentPublicationUri ||
      post.publication.uri !== currentPublicationUri);
  const pubInfo =
    showPubInfo && post.publication?.record ? (
      <PubInfoLine
        name={post.publication.record.name}
        url={absolutize(getPublicationURL(post.publication), assetsBaseUrl)}
        iconSrc={
          post.publication.record.icon && pubDid
            ? blobRefToSrc(
                post.publication.record.icon.ref,
                pubDid,
                assetsBaseUrl,
              )
            : undefined
        }
        nameColor={pickAccentContrast(cardTheme, cardBg)}
        theme={cardTheme}
      />
    ) : null;

  // Medium and large clamp the title to 2 lines like the web (`line-clamp-2`);
  // small is unclamped on the web too.
  const titleClamp: CSSProperties =
    size === "small"
      ? {}
      : {
          display: "-webkit-box",
          maxHeight: "2.6em",
          overflow: "hidden",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
        };
  const title = (
    <span
      style={{
        color: cardTheme.primary,
        display: "block",
        fontFamily: cardTheme.headingFont,
        fontWeight: "bold",
        fontSize: size === "large" ? 20 : 18,
        lineHeight: 1.3,
        wordBreak: "break-word",
        ...titleClamp,
      }}
    >
      {post.record.title}
    </span>
  );
  const meta = (
    <MetaLine
      author={authorLabel}
      date={dateLabel}
      colors={colors}
      bodyFont={cardTheme.bodyFont}
    />
  );

  const textCell = (padding: string) => (
    <td style={{ padding, verticalAlign: "top", wordBreak: "break-word" }}>
      {pubInfo}
      <Link href={docUrl} style={cellLinkStyle}>
        {title}
        {size !== "small" && description ? (
          <span
            style={descriptionStyle(colors, cardTheme.bodyFont, 16)}
          >
            {description}
          </span>
        ) : null}
        {meta}
      </Link>
    </td>
  );

  return (
    <Section style={{ margin: BLOCK_MARGIN, minWidth: "100%" }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        {...bgcolorAttr(cardBg)}
        style={cardTableStyle(borderColor, cardBg)}
      >
        <tbody>
          {size === "large" && coverImageSrc ? (
            <tr>
              <td style={{ padding: 0 }}>
                <Link href={docUrl} style={cellLinkStyle}>
                  {/* Fixed height approximates the web's 1.91:1 cover crop at
                      the card's desktop inner width. object-fit clients crop
                      like the web; Outlook distorts instead — the same
                      tradeoff LinkBlock takes. */}
                  <Img
                    src={coverImageSrc}
                    alt={post.record.title}
                    width="100%"
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                      borderTopLeftRadius: CARD_RADIUS - 1,
                      borderTopRightRadius: CARD_RADIUS - 1,
                      display: "block",
                      height: Math.round((theme.pageWidth - 48) / 1.91),
                      objectFit: "cover",
                      width: "100%",
                    }}
                  />
                </Link>
              </td>
            </tr>
          ) : null}
          {size === "medium" && coverImageSrc ? (
            <tr>
              {textCell("12px")}
              <td
                width={MEDIUM_COVER_SIZE}
                style={{
                  padding: 0,
                  verticalAlign: "top",
                  width: MEDIUM_COVER_SIZE,
                }}
              >
                <Link href={docUrl} style={cellLinkStyle}>
                  <Img
                    src={coverImageSrc}
                    alt={post.record.title}
                    width={MEDIUM_COVER_SIZE}
                    height={MEDIUM_COVER_SIZE}
                    style={{
                      borderTopRightRadius: CARD_RADIUS - 1,
                      display: "block",
                      height: MEDIUM_COVER_SIZE,
                      objectFit: "cover",
                      width: MEDIUM_COVER_SIZE,
                    }}
                  />
                </Link>
              </td>
            </tr>
          ) : (
            <tr>{textCell(size === "small" ? "8px 12px" : "12px")}</tr>
          )}
        </tbody>
      </table>
    </Section>
  );
};

export const StandardSitePublicationEmailBlock = ({
  publication,
  showPublicationTheme,
  theme,
  assetsBaseUrl,
}: {
  publication: StandardSitePublicationData;
  showPublicationTheme: boolean;
  theme: EmailTheme;
  assetsBaseUrl: string;
}) => {
  const { record, author } = publication;
  const pubUrl = absolutize(getPublicationURL(publication), assetsBaseUrl);

  let host: string | undefined;
  try {
    host = new AtUri(publication.uri).host;
  } catch {
    host = undefined;
  }

  // Mirror WithPublicationTheme: themed only when enabled, the referenced
  // publication actually defines a theme, and its URI parses; otherwise
  // children inherit the surrounding (email) theme.
  const cardTheme =
    showPublicationTheme && host && (record.theme || record.basicTheme)
      ? resolveCardTheme([record], false)
      : outerCardTheme(theme);
  const colors = resolveColors(cardTheme);
  const cardBg = cardTheme.pageBackground;
  const borderColor = resolveColors(theme).borderLight;

  const iconSrc =
    record.icon && host
      ? blobRefToSrc(record.icon.ref, host, assetsBaseUrl)
      : undefined;

  const authorLabel = author ? bylineLabel(author) : undefined;

  return (
    <Section style={{ margin: BLOCK_MARGIN, minWidth: "100%" }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        {...bgcolorAttr(cardBg)}
        style={cardTableStyle(borderColor, cardBg)}
      >
        <tbody>
          <tr>
            <td
              width={60}
              style={{ padding: "12px 0 12px 12px", verticalAlign: "top" }}
            >
              <Link href={pubUrl} style={cellLinkStyle}>
                {iconSrc ? (
                  <Img
                    src={iconSrc}
                    width={48}
                    height={48}
                    alt=""
                    style={{
                      borderRadius: 24,
                      display: "block",
                      height: 48,
                      objectFit: "cover",
                      width: 48,
                    }}
                  />
                ) : (
                  // PubIcon's letter fallback. Outlook drops the radius and
                  // renders a square — acceptable.
                  <span
                    style={{
                      backgroundColor: cardTheme.accentBackground,
                      borderRadius: 24,
                      color: cardTheme.accentText,
                      display: "block",
                      fontFamily: cardTheme.bodyFont,
                      fontSize: 24,
                      fontWeight: "bold",
                      height: 48,
                      lineHeight: "48px",
                      textAlign: "center",
                      width: 48,
                    }}
                  >
                    {record.name ? record.name.slice(0, 1).toUpperCase() : "P"}
                  </span>
                )}
              </Link>
            </td>
            <td
              style={{
                padding: 12,
                verticalAlign: "top",
                wordBreak: "break-word",
              }}
            >
              <Link href={pubUrl} style={cellLinkStyle}>
                <span
                  style={{
                    color: pickAccentContrast(cardTheme, cardBg),
                    display: "block",
                    fontFamily: cardTheme.headingFont,
                    fontWeight: "bold",
                    fontSize: 18,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {record.name}
                </span>
                {record.description ? (
                  <span
                    style={descriptionStyle(colors, cardTheme.bodyFont, 14)}
                  >
                    {record.description}
                  </span>
                ) : null}
                {authorLabel ? (
                  <span
                    style={{
                      color: colors.tertiary,
                      display: "block",
                      fontFamily: cardTheme.bodyFont,
                      fontSize: 14,
                      lineHeight: 1.4,
                      marginTop: 4,
                    }}
                  >
                    {authorLabel}
                  </span>
                ) : null}
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
};
