import {
  Body,
  Column,
  Heading as ReactEmailHeading,
  Hr,
  Html,
  Img,
  Link,
  Text as ReactEmailText,
  Section,
  Row,
  CodeBlock as ReactEmailCodeBlock,
  dracula,
} from "@react-email/components";
import type { PrismLanguage } from "@react-email/code-block";
import React, { type CSSProperties } from "react";
import {
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksButton,
  PubLeafletBlocksCode,
  PubLeafletBlocksHeader,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksImage,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksWebsite,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import {
  bgcolorAttr,
  defaultEmailTheme,
  LeafletWatermark,
  MailHead,
  makeStaticUrl,
  resolveColors,
  type EmailTheme,
  type ResolvedColors,
} from "./shared";

export type PostEmailProps = {
  publicationName: string;
  publicationUrl: string;
  postTitle: string;
  postDescription?: string;
  postUrl: string;
  authorName?: string;
  publishedAtLabel?: string;
  blocks: PubLeafletPagesLinearDocument.Block[];
  /**
   * Used to build absolute URLs for `pub.leaflet.blocks.image` blob refs via
   * the /api/atproto_images proxy. Preview renders from drafts may encode a
   * direct URL in the blob ref's $link instead — we pass those through.
   */
  did: string;
  /**
   * If omitted the template renders a "(preview)" footer in place of the
   * real unsubscribe link — used by the Phase 4 preview-send path.
   */
  unsubscribeUrl?: string;
  /**
   * Absolute URL used to resolve bundled /email-assets/* images. Postmark
   * fetches `<img src>` verbatim so these must be absolute in outgoing mail.
   */
  assetsBaseUrl: string;
  theme?: EmailTheme;
};

const drawerUrl = (base: string, drawer: "quotes" | "comments") => {
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}interactionDrawer=${drawer}`;
};

const textBlock = (plaintext: string): PubLeafletPagesLinearDocument.Block => ({
  $type: "pub.leaflet.pages.linearDocument#block",
  block: { $type: "pub.leaflet.blocks.text", plaintext },
});

const headingBlock = (
  plaintext: string,
  level: number,
): PubLeafletPagesLinearDocument.Block => ({
  $type: "pub.leaflet.pages.linearDocument#block",
  block: { $type: "pub.leaflet.blocks.header", plaintext, level },
});

const defaultProps: PostEmailProps = {
  publicationName: "Publication",
  publicationUrl: "https://leaflet.pub",
  postTitle: "Post Title Here",
  postDescription:
    "Hello this is a description of everything that is to come",
  postUrl: "https://leaflet.pub",
  authorName: "author",
  publishedAtLabel: "Jan 1, 2026",
  assetsBaseUrl: "https://leaflet.pub/",
  did: "did:plc:example",
  blocks: [
    textBlock(
      "This would be the post. I'll give it a little lorem ipsum to make it look longer so i don't forget which thing is what.",
    ),
    headingBlock("This is a Title", 1),
    textBlock(
      "We'll keep it nice and separate so we can see what it looks like.",
    ),
    headingBlock("And a Header", 2),
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: {
        $type: "pub.leaflet.blocks.unorderedList",
        children: [
          {
            content: { $type: "pub.leaflet.blocks.text", plaintext: "fruits" },
            children: [
              {
                content: {
                  $type: "pub.leaflet.blocks.text",
                  plaintext: "apple",
                },
              },
              {
                content: {
                  $type: "pub.leaflet.blocks.text",
                  plaintext: "banana",
                },
              },
            ],
          },
          {
            content: {
              $type: "pub.leaflet.blocks.text",
              plaintext: "veggies",
            },
          },
        ],
      },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: {
        $type: "pub.leaflet.blocks.blockquote",
        plaintext: "A quote of some kind.",
      },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: {
        $type: "pub.leaflet.blocks.code",
        plaintext: "const x = 1;",
        language: "javascript",
      },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: {
        $type: "pub.leaflet.blocks.website",
        src: "https://example.com",
        title: "Link Title Here",
        description: "Description on the link",
      },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: {
        $type: "pub.leaflet.blocks.button",
        text: "Click me",
        url: "https://leaflet.pub",
      },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      alignment: "lex:pub.leaflet.pages.linearDocument#textAlignLeft",
      block: {
        $type: "pub.leaflet.blocks.button",
        text: "Aligned left",
        url: "https://leaflet.pub",
      },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      alignment: "lex:pub.leaflet.pages.linearDocument#textAlignRight",
      block: {
        $type: "pub.leaflet.blocks.button",
        text: "Aligned right",
        url: "https://leaflet.pub",
      },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: { $type: "pub.leaflet.blocks.horizontalRule" },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: { $type: "pub.leaflet.blocks.math" },
    },
  ],
};

const BLOCK_MARGIN_TOP = 4;
const BLOCK_MARGIN_BOTTOM = 16;
const BLOCK_MARGIN = `${BLOCK_MARGIN_TOP}px 0 ${BLOCK_MARGIN_BOTTOM}px`;
const IMAGE_MARGIN = `${BLOCK_MARGIN_TOP}px auto ${BLOCK_MARGIN_BOTTOM}px`;
const HEADING_MARGIN = `${BLOCK_MARGIN_TOP}px 0 0`;
const HEADING_FONT_SIZE_PX: Record<1 | 2 | 3, number> = {
  1: 26,
  2: 18,
  3: 16,
};

export const PostEmail = (props: Partial<PostEmailProps> = {}) => {
  const p: PostEmailProps = { ...defaultProps, ...props };
  const theme = p.theme ?? defaultEmailTheme;
  const c = resolveColors(theme);
  const staticUrl = makeStaticUrl(p.assetsBaseUrl);
  const byline = [p.authorName, p.publishedAtLabel].filter(Boolean).join(" | ");

  const accentLink: CSSProperties = {
    color: theme.accentBackground,
    textDecoration: "none",
    fontFamily: theme.bodyFont,
  };

  return (
    <Html>
      <MailHead>
        {/* Mobile-only padding tightening. Apple Mail, iOS Mail, Gmail web,
            and most other clients honor @media in <head>; Outlook desktop
            ignores it and keeps the wider inline padding, which is fine
            (it's a desktop client). !important is required so the
            media-query rule beats the inline `style.padding`. */}
        <style>{`
          @media only screen and (max-width: 480px) {
            .email-page-pad { padding: 12px 8px !important; }
            .email-card-pad { padding: 16px !important; }
          }
        `}</style>
      </MailHead>
      <Body
        style={{
          backgroundColor: theme.backgroundColor,
          color: theme.primary,
          fontFamily: theme.bodyFont,
          margin: 0,
          padding: 0,
        }}
      >
        {/* Page-background wrapper. Gmail strips/replaces <body> styling, so
            we paint the background on this table's <td> using both the
            bgcolor HTML attribute (Outlook/Gmail bulletproof) and a
            backgroundColor style (everything else). */}
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          bgcolor={theme.backgroundColor}
          style={{
            width: "100%",
            backgroundColor: theme.backgroundColor,
          }}
        >
          <tbody>
            <tr>
              <td
                align="center"
                className="email-page-pad"
                {...bgcolorAttr(theme.backgroundColor)}
                style={{
                  backgroundColor: theme.backgroundColor,
                  padding: "24px 16px",
                }}
              >
                {/* Responsive width: `width="100%"` lets the card fill its
                    container, and `max-width: pageWidth` caps it on wider
                    viewports. This keeps it readable at the publication's
                    page width on desktop while shrinking gracefully when
                    the email is viewed in a narrow window (e.g. Apple Mail
                    desktop resized below the page width). Outlook desktop
                    ignores `max-width` and will render full-width — that's
                    a known tradeoff for the simpler markup. */}
                <table
                  role="presentation"
                  align="center"
                  className="email-card-table"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{
                    width: "100%",
                    maxWidth: theme.pageWidth,
                    margin: "0 auto",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        className="email-card-pad"
                        {...bgcolorAttr(theme.pageBackground)}
                        style={{
                          backgroundColor: theme.pageBackground,
                          border: `1px solid ${c.border}`,
                          borderRadius: 8,
                          padding: "20px 24px",
                        }}
                      >
                <Link
                  href={p.publicationUrl}
                  style={{
                    ...accentLink,
                    fontWeight: "bold",
                    fontSize: 16,
                  }}
                >
                  {p.publicationName}
                </Link>

                <ReactEmailHeading
                  as="h1"
                  style={{
                    color: theme.primary,
                    fontFamily: theme.headingFont,
                    fontWeight: "bold",
                    fontSize: 26,
                    lineHeight: 1.2,
                    margin: "8px 0 0",
                  }}
                >
                  <Link
                    href={p.postUrl}
                    style={{
                      color: theme.primary,
                      fontFamily: theme.headingFont,
                      textDecoration: "none",
                    }}
                  >
                    {p.postTitle}
                  </Link>
                </ReactEmailHeading>

                {p.postDescription ? (
                  <ReactEmailText
                    style={{
                      color: c.secondary,
                      fontFamily: theme.bodyFont,
                      fontSize: 16,
                      fontStyle: "italic",
                      lineHeight: 1.4,
                      margin: "4px 0 0",
                    }}
                  >
                    {p.postDescription}
                  </ReactEmailText>
                ) : null}

                {byline ? (
                  <Section
                    style={{ margin: "12px 0 28px", minWidth: "100%" }}
                  >
                    <Row style={{ minWidth: "100%" }}>
                      <Column style={{ verticalAlign: "middle" }}>
                        <ReactEmailText
                          style={{
                            color: c.tertiary,
                            fontFamily: theme.bodyFont,
                            fontSize: 14,
                            lineHeight: 1.4,
                            margin: 0,
                          }}
                        >
                          {byline}
                        </ReactEmailText>
                      </Column>
                      <Column style={{ width: 12 }} />
                      <Column style={{ width: 16, verticalAlign: "middle" }}>
                        <Link
                          href={drawerUrl(p.postUrl, "quotes")}
                          style={accentLink}
                        >
                          <Img
                            width={16}
                            height={16}
                            src={staticUrl("quote.png")}
                            alt="See quotes"
                          />
                        </Link>
                      </Column>
                      <Column style={{ width: 8 }} />
                      <Column style={{ width: 16, verticalAlign: "middle" }}>
                        <Link
                          href={drawerUrl(p.postUrl, "comments")}
                          style={accentLink}
                        >
                          <Img
                            width={16}
                            height={16}
                            src={staticUrl("comment.png")}
                            alt="See comments"
                          />
                        </Link>
                      </Column>
                    </Row>
                  </Section>
                ) : null}

                {p.blocks.map((b, i) => (
                  <BlockRenderer
                    key={i}
                    block={b.block}
                    alignment={b.alignment}
                    did={p.did}
                    assetsBaseUrl={p.assetsBaseUrl}
                    theme={theme}
                    colors={c}
                  />
                ))}

                {/* Footer: Gmail won't reliably cascade `text-align` from a
                    wrapping <table>, so each centered row is its own <td
                    align="center"> — the bulletproof email-centering
                    pattern. `min-width: 100%` keeps Gmail iOS from
                    shrink-wrapping the table around the short link text. */}
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ width: "100%", minWidth: "100%" }}
                >
                  <tbody>
                    <tr>
                      <td align="center" style={{ paddingTop: 16 }}>
                        <Link
                          href={p.postUrl}
                          style={{
                            ...accentLink,
                            fontWeight: "bold",
                            fontSize: 14,
                            lineHeight: "20px",
                          }}
                        >
                          Read in Browser
                        </Link>
                      </td>
                    </tr>
                    <tr>
                      <td
                        align="center"
                        style={{
                          color: c.tertiary,
                          fontFamily: theme.bodyFont,
                          fontSize: 14,
                          lineHeight: "20px",
                          paddingTop: 8,
                        }}
                      >
                        {p.unsubscribeUrl ? (
                          <Link
                            href={p.unsubscribeUrl}
                            style={{
                              color: c.tertiary,
                              fontSize: 14,
                              lineHeight: "20px",
                              textDecoration: "underline",
                            }}
                          >
                            Unsubscribe
                          </Link>
                        ) : (
                          <span style={{ fontStyle: "italic" }}>
                            (preview — not sent to subscribers)
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Spacer */}
                    <tr>
                      <td
                        style={{
                          fontSize: 0,
                          height: 16,
                          lineHeight: "16px",
                        }}
                      >
                        &nbsp;
                      </td>
                    </tr>

                    {/* Horizontal rule above watermark. <hr> margins are
                        flaky in Gmail, so we use a 1px-tall <td> with
                        border-top instead. */}
                    <tr>
                      <td
                        style={{
                          borderTop: `1px solid ${c.borderLight}`,
                          fontSize: 0,
                          height: 1,
                          lineHeight: "1px",
                        }}
                      >
                        &nbsp;
                      </td>
                    </tr>

                    <tr>
                      <td
                        style={{
                          fontSize: 0,
                          height: 12,
                          lineHeight: "12px",
                        }}
                      >
                        &nbsp;
                      </td>
                    </tr>

                    <tr>
                      <td align="center">
                        <LeafletWatermark
                          theme={theme}
                          staticUrl={staticUrl}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
};
export default PostEmail;

// Map the lexicon's alignment token to the simple left/center/right values
// usable as HTML `align` attributes. `justify` falls through to `left` to
// match published web behavior (`justify-start` flex). For buttons we
// default to `center` when alignment is unset, matching PostContent.tsx.
const resolveButtonAlignment = (
  alignment: string | undefined,
): "left" | "center" | "right" => {
  switch (alignment) {
    case "lex:pub.leaflet.pages.linearDocument#textAlignRight":
      return "right";
    case "lex:pub.leaflet.pages.linearDocument#textAlignLeft":
    case "lex:pub.leaflet.pages.linearDocument#textAlignJustify":
      return "left";
    case "lex:pub.leaflet.pages.linearDocument#textAlignCenter":
    default:
      return "center";
  }
};

const BlockRenderer = ({
  block,
  alignment,
  did,
  assetsBaseUrl,
  theme,
  colors,
}: {
  block: PubLeafletPagesLinearDocument.Block["block"];
  alignment?: string;
  did: string;
  assetsBaseUrl: string;
  theme: EmailTheme;
  colors: ResolvedColors;
}) => {
  if (PubLeafletBlocksText.isMain(block)) {
    return (
      <ReactEmailText
        style={{
          color: theme.primary,
          fontFamily: theme.bodyFont,
          fontSize: 16,
          lineHeight: 1.5,
          margin: BLOCK_MARGIN,
        }}
      >
        {block.plaintext || " "}
      </ReactEmailText>
    );
  }
  if (PubLeafletBlocksHeader.isMain(block)) {
    const level = Math.min(
      3,
      Math.max(1, Math.floor(block.level ?? 1)),
    ) as 1 | 2 | 3;
    return (
      <ReactEmailHeading
        as={`h${level}`}
        style={{
          color: level === 3 ? colors.secondary : theme.primary,
          fontFamily: theme.headingFont,
          fontWeight: "bold",
          fontSize: HEADING_FONT_SIZE_PX[level],
          lineHeight: 1.25,
          margin: HEADING_MARGIN,
        }}
      >
        {block.plaintext}
      </ReactEmailHeading>
    );
  }
  if (PubLeafletBlocksBlockquote.isMain(block)) {
    return (
      <Section style={{ margin: BLOCK_MARGIN }}>
        <Row>
          <Column style={{ width: 2, backgroundColor: colors.border }} />
          <Column style={{ width: 8 }} />
          <Column>
            <ReactEmailText
              style={{
                color: theme.primary,
                fontFamily: theme.bodyFont,
                fontSize: 16,
                lineHeight: 1.5,
                margin: "2px 0",
              }}
            >
              {block.plaintext}
            </ReactEmailText>
          </Column>
        </Row>
      </Section>
    );
  }
  if (PubLeafletBlocksCode.isMain(block)) {
    return (
      <CodeBlock
        code={block.plaintext}
        language={block.language}
        borderColor={colors.borderLight}
      />
    );
  }
  if (PubLeafletBlocksImage.isMain(block)) {
    const src = blobRefToSrc(block.image.ref, did, assetsBaseUrl);
    // Deliberately no numeric `width`/`height` HTML attributes: Outlook
    // honors those over CSS `max-width`, so a 1200px natural-size photo
    // would blow out our 28rem container. `max-width: <natural>px` keeps
    // smaller images from being upscaled.
    const naturalWidth = block.aspectRatio?.width;
    return (
      <Img
        src={src}
        alt={block.alt ?? ""}
        style={{
          display: "block",
          height: "auto",
          margin: IMAGE_MARGIN,
          maxWidth: naturalWidth ? `${naturalWidth}px` : "100%",
          width: "100%",
        }}
      />
    );
  }
  if (PubLeafletBlocksWebsite.isMain(block)) {
    const previewSrc = block.previewImage
      ? blobRefToSrc(block.previewImage.ref, did, assetsBaseUrl)
      : undefined;
    return (
      <LinkBlock
        url={block.src}
        title={block.title}
        description={block.description}
        previewSrc={previewSrc}
        theme={theme}
        colors={colors}
      />
    );
  }
  if (PubLeafletBlocksButton.isMain(block)) {
    return (
      <ButtonBlock
        text={block.text}
        url={block.url}
        align={resolveButtonAlignment(alignment)}
        theme={theme}
      />
    );
  }
  if (PubLeafletBlocksHorizontalRule.isMain(block)) {
    return (
      <Hr
        style={{
          border: "none",
          borderTop: `1px solid ${colors.borderLight}`,
          margin: "12px 0",
          width: "100%",
        }}
      />
    );
  }
  if (PubLeafletBlocksUnorderedList.isMain(block)) {
    return (
      <List
        items={block.children}
        style="unordered"
        did={did}
        assetsBaseUrl={assetsBaseUrl}
        theme={theme}
      />
    );
  }
  if (PubLeafletBlocksOrderedList.isMain(block)) {
    return (
      <List
        items={block.children}
        style="ordered"
        did={did}
        assetsBaseUrl={assetsBaseUrl}
        theme={theme}
      />
    );
  }
  return <BlockNotSupported theme={theme} colors={colors} />;
};

// Helpers used by the confirm-email templates inside their <Tailwind>
// context. Layout (margin/font-size/line-height) is inline so they render
// without Tailwind too; color and font-family are left to the caller via
// className or a `style` override so Tailwind classes can win.
export const Text = (props: {
  children: React.ReactNode;
  noPadding?: boolean;
  small?: boolean;
  className?: string;
  style?: CSSProperties;
}) => {
  const fontSize = props.small ? 14 : 16;
  return (
    <ReactEmailText
      className={props.className}
      style={{
        fontSize,
        lineHeight: 1.5,
        margin: props.noPadding ? 0 : BLOCK_MARGIN,
        ...props.style,
      }}
    >
      {props.children}
    </ReactEmailText>
  );
};

export const Heading = (props: {
  children: React.ReactNode;
  noPadding?: boolean;
  as: "h1" | "h2" | "h3";
  className?: string;
  style?: CSSProperties;
}) => {
  const fontSize =
    props.as === "h1" ? 26 : props.as === "h2" ? 18 : 16;
  return (
    <ReactEmailHeading
      as={props.as}
      className={props.className}
      style={{
        fontWeight: "bold",
        fontSize,
        lineHeight: 1.25,
        margin: props.noPadding ? 0 : HEADING_MARGIN,
        ...props.style,
      }}
    >
      {props.children}
    </ReactEmailHeading>
  );
};

type ListItem =
  | PubLeafletBlocksUnorderedList.ListItem
  | PubLeafletBlocksOrderedList.ListItem;

const listItemPlaintext = (item: ListItem): string => {
  const content = item.content;
  if (PubLeafletBlocksText.isMain(content)) return content.plaintext;
  if (PubLeafletBlocksHeader.isMain(content)) return content.plaintext;
  return "";
};

export const List = ({
  items,
  style,
  did,
  assetsBaseUrl,
  theme = defaultEmailTheme,
}: {
  items: ListItem[];
  style: "ordered" | "unordered";
  did: string;
  assetsBaseUrl: string;
  theme?: EmailTheme;
}) => {
  const Tag = style === "ordered" ? "ol" : "ul";
  return (
    <Section style={{ margin: BLOCK_MARGIN }}>
      <Tag
        style={{
          color: theme.primary,
          fontFamily: theme.bodyFont,
          fontSize: 16,
          lineHeight: 1.5,
          margin: 0,
          paddingLeft: 24,
        }}
      >
        {items.map((item, i) => {
          const plaintext = listItemPlaintext(item);
          const nestedUnordered =
            item.children && style === "unordered"
              ? (item.children as PubLeafletBlocksUnorderedList.ListItem[])
              : (item as PubLeafletBlocksOrderedList.ListItem)
                  .unorderedListChildren?.children;
          const nestedOrdered =
            item.children && style === "ordered"
              ? (item.children as PubLeafletBlocksOrderedList.ListItem[])
              : (item as PubLeafletBlocksUnorderedList.ListItem)
                  .orderedListChildren?.children;
          return (
            <React.Fragment key={i}>
              <li style={{ margin: "2px 0", paddingLeft: 4 }}>
                {typeof item.checked === "boolean"
                  ? `${item.checked ? "☑ " : "☐ "}${plaintext}`
                  : plaintext}
              </li>
              {nestedUnordered && nestedUnordered.length > 0 ? (
                <List
                  items={nestedUnordered}
                  style="unordered"
                  did={did}
                  assetsBaseUrl={assetsBaseUrl}
                  theme={theme}
                />
              ) : null}
              {nestedOrdered && nestedOrdered.length > 0 ? (
                <List
                  items={nestedOrdered}
                  style="ordered"
                  did={did}
                  assetsBaseUrl={assetsBaseUrl}
                  theme={theme}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </Tag>
    </Section>
  );
};

export const LinkBlock = ({
  url,
  title,
  description,
  previewSrc,
  theme = defaultEmailTheme,
  colors,
}: {
  url?: string;
  title?: string;
  description?: string;
  previewSrc?: string;
  theme?: EmailTheme;
  colors?: ResolvedColors;
} = {}) => {
  const c = colors ?? resolveColors(theme);
  const displayUrl = (() => {
    if (!url) return "www.example.com";
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  return (
    <Section style={{ margin: BLOCK_MARGIN, minWidth: "100%" }}>
      <Row
        style={{
          border: `1px solid ${theme.accentBackground}`,
          borderRadius: 8,
          minWidth: "100%",
        }}
      >
        <Column
          style={{
            padding: "8px 12px",
            verticalAlign: "top",
            // Long URL-like titles or domains have no break opportunities
            // and would otherwise force the column wider than the card.
            wordBreak: "break-word",
          }}
        >
          <Link
            href={url}
            style={{
              color: theme.primary,
              fontFamily: theme.bodyFont,
              fontWeight: "bold",
              fontSize: 16,
              textDecoration: "none",
              wordBreak: "break-word",
            }}
          >
            {title || displayUrl}
          </Link>
          {description ? (
            <ReactEmailText
              style={{
                color: c.secondary,
                fontFamily: theme.bodyFont,
                fontSize: 16,
                lineHeight: 1.4,
                margin: "4px 0 0",
                wordBreak: "break-word",
              }}
            >
              {description}
            </ReactEmailText>
          ) : null}
          <ReactEmailText
            style={{
              color: theme.accentBackground,
              fontFamily: theme.bodyFont,
              fontSize: 14,
              fontStyle: "italic",
              lineHeight: 1.4,
              margin: "4px 0 0",
              wordBreak: "break-word",
            }}
          >
            {displayUrl}
          </ReactEmailText>
        </Column>
        {previewSrc ? (
          <Column
            style={{
              padding: "8px 8px 8px 0",
              verticalAlign: "top",
              width: 112,
            }}
          >
            <Img
              src={previewSrc}
              alt=""
              style={{
                borderRadius: 4,
                display: "block",
                height: 88,
                objectFit: "cover",
                width: "100%",
              }}
            />
          </Column>
        ) : null}
      </Row>
    </Section>
  );
};

export const ButtonBlock = ({
  text,
  url,
  align = "center",
  theme = defaultEmailTheme,
}: {
  text: string;
  url: string;
  align?: "left" | "center" | "right";
  theme?: EmailTheme;
}) => {
  // Bulletproof button: table-based so Outlook (which ignores padding on
  // <a>) renders a real clickable button. The `<td>` carries the bgcolor
  // attribute and padding; the `<a>` is `display: block` so the entire
  // padded area is clickable. Alignment via the table's `align` HTML
  // attribute — Gmail won't reliably cascade `text-align` from a wrapping
  // <Section>, so we anchor on the table itself.
  return (
    <Section style={{ margin: BLOCK_MARGIN, minWidth: "100%" }}>
      <table
        role="presentation"
        align={align}
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ borderCollapse: "separate" }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              {...bgcolorAttr(theme.accentBackground)}
              style={{
                backgroundColor: theme.accentBackground,
                borderRadius: 6,
                padding: "10px 20px",
              }}
            >
              <Link
                href={url}
                style={{
                  color: theme.accentText,
                  display: "block",
                  fontFamily: theme.bodyFont,
                  fontSize: 16,
                  fontWeight: "bold",
                  lineHeight: "20px",
                  textDecoration: "none",
                }}
              >
                {text}
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
};

export const CodeBlock = ({
  code,
  language,
  borderColor,
}: {
  code?: string;
  language?: string;
  borderColor?: string;
} = {}) => {
  return (
    <ReactEmailCodeBlock
      style={{
        border: `1px solid ${borderColor ?? "rgba(0, 0, 0, 0.1)"}`,
        borderRadius: 4,
        boxSizing: "border-box",
        margin: BLOCK_MARGIN,
        maxWidth: "100%",
        // <pre> defaults to `white-space: pre`, so long lines blow past the
        // card on mobile. Wrap, and break long tokens (URLs, identifiers)
        // when nothing else fits.
        overflow: "hidden",
        padding: 8,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
      code={code ?? ""}
      theme={dracula}
      language={(language as PrismLanguage) || "text"}
    />
  );
};

export const BlockNotSupported = ({
  theme = defaultEmailTheme,
  colors,
}: {
  theme?: EmailTheme;
  colors?: ResolvedColors;
} = {}) => {
  const c = colors ?? resolveColors(theme);
  return (
    <Section
      style={{
        backgroundColor: c.borderLight,
        borderRadius: 4,
        margin: BLOCK_MARGIN,
        padding: "16px 12px",
      }}
    >
      <ReactEmailText
        style={{
          color: c.tertiary,
          fontFamily: theme.bodyFont,
          fontSize: 14,
          fontStyle: "italic",
          lineHeight: 1.4,
          margin: 0,
          textAlign: "center",
        }}
      >
        This media isn't supported in email...
      </ReactEmailText>
      <ReactEmailText
        style={{
          fontSize: 14,
          lineHeight: 1.4,
          margin: "4px 0 0",
          textAlign: "center",
        }}
      >
        <Link
          style={{
            color: theme.accentBackground,
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          See full post
        </Link>
      </ReactEmailText>
    </Section>
  );
};
