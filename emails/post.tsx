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
import { UnicodeString } from "@atproto/api";
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
  PubLeafletRichtextFacet,
} from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { atUriToUrl, didToBlueskyUrl } from "src/utils/mentionUtils";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { emailPropsFromPublication } from "./fromPublication";
import {
  bgcolorAttr,
  defaultEmailTheme,
  LeafletWatermark,
  MailHead,
  makeEmailIconUrl,
  makeStaticUrl,
  resolveColors,
  type EmailTheme,
  type ResolvedColors,
} from "./shared";
import { supabaseServerClient } from "supabase/serverClient";

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

const textBlock = (
  plaintext: string,
  facets?: PubLeafletRichtextFacet.Main[],
): PubLeafletPagesLinearDocument.Block => ({
  $type: "pub.leaflet.pages.linearDocument#block",
  block: { $type: "pub.leaflet.blocks.text", plaintext, facets },
});

const headingBlock = (
  plaintext: string,
  level: number,
): PubLeafletPagesLinearDocument.Block => ({
  $type: "pub.leaflet.pages.linearDocument#block",
  block: { $type: "pub.leaflet.blocks.header", plaintext, level },
});

const facet = (
  byteStart: number,
  byteEnd: number,
  features: PubLeafletRichtextFacet.Main["features"],
): PubLeafletRichtextFacet.Main => ({
  $type: "pub.leaflet.richtext.facet",
  index: { byteStart, byteEnd },
  features,
});

const defaultProps: PostEmailProps = {
  publicationName: "Publication",
  publicationUrl: "https://leaflet.pub",
  postTitle: "Post Title Here",
  postDescription: "Hello this is a description of everything that is to come",
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
      "We'll keep it nice and separate so we can see what it looks like. Also bold, italic, underlined, struck, code, a link, and a mention to @leaflet.pub.",
      [
        facet(71, 75, [{ $type: "pub.leaflet.richtext.facet#bold" }]),
        facet(77, 83, [{ $type: "pub.leaflet.richtext.facet#italic" }]),
        facet(85, 95, [{ $type: "pub.leaflet.richtext.facet#underline" }]),
        facet(97, 103, [{ $type: "pub.leaflet.richtext.facet#strikethrough" }]),
        facet(105, 109, [{ $type: "pub.leaflet.richtext.facet#code" }]),
        facet(111, 117, [
          {
            $type: "pub.leaflet.richtext.facet#link",
            uri: "https://leaflet.pub",
          },
        ]),
        facet(136, 148, [
          {
            $type: "pub.leaflet.richtext.facet#didMention",
            did: "did:plc:x2xmijn2egk5g67u3cwkddzy",
          },
        ]),
      ],
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
      ...textBlock("This text is centered."),
      alignment: "lex:pub.leaflet.pages.linearDocument#textAlignCenter",
    },
    {
      ...textBlock("This text is right-aligned."),
      alignment: "lex:pub.leaflet.pages.linearDocument#textAlignRight",
    },
    {
      ...headingBlock("Centered heading", 2),
      alignment: "lex:pub.leaflet.pages.linearDocument#textAlignCenter",
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
            .email-page-pad { padding: 0 !important; }
            .email-card-pad { padding: 12px !important; }
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
                        {...(theme.showPageBackground
                          ? bgcolorAttr(theme.pageBackground)
                          : {})}
                        style={{
                          backgroundColor: theme.showPageBackground
                            ? theme.pageBackground
                            : undefined,
                          border: theme.showPageBackground
                            ? `1px solid ${c.border}`
                            : undefined,
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
                              <Column
                                style={{ width: 16, verticalAlign: "middle" }}
                              >
                                <Link
                                  href={drawerUrl(p.postUrl, "quotes")}
                                  style={accentLink}
                                >
                                  <Img
                                    width={16}
                                    height={16}
                                    src={makeEmailIconUrl(
                                      p.assetsBaseUrl,
                                      "quote",
                                      theme.accentBackground,
                                    )}
                                    alt="See quotes"
                                  />
                                </Link>
                              </Column>
                              <Column style={{ width: 8 }} />
                              <Column
                                style={{ width: 16, verticalAlign: "middle" }}
                              >
                                <Link
                                  href={drawerUrl(p.postUrl, "comments")}
                                  style={accentLink}
                                >
                                  <Img
                                    width={16}
                                    height={16}
                                    src={makeEmailIconUrl(
                                      p.assetsBaseUrl,
                                      "comment",
                                      theme.accentBackground,
                                    )}
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
// `npm run email:dev` renders this default export. Set
// `PREVIEW_PUBLICATION_URI` below to an `at://did:plc:.../pub.leaflet.publication/<rkey>`
// to preview the post template with that publication's name, url, and theme —
// matching what `send_post_broadcast` and `sendPostPreview` resolve at send time.
// Leave it null to render with the static default props.
const PREVIEW_PUBLICATION_URI: string | null = null;
const PostEmailPreview = async () => {
  if (!PREVIEW_PUBLICATION_URI) return <PostEmail />;

  const { data: publication, error } = await supabaseServerClient
    .from("publications")
    .select("record")
    .eq("uri", PREVIEW_PUBLICATION_URI)
    .maybeSingle();

  if (error || !publication) {
    console.warn(
      `[email preview] could not load publication ${PREVIEW_PUBLICATION_URI}:`,
      error?.message ?? "not found",
    );
    return <PostEmail />;
  }

  const pubProps = emailPropsFromPublication(
    normalizePublicationRecord(publication.record),
  );
  return <PostEmail {...pubProps} />;
};

export default PostEmailPreview;

// Map the lexicon's alignment token to a CSS `text-align` value for
// text-like blocks (text, header, blockquote, list). Returns `undefined`
// when no alignment is set so the element inherits the default (left).
const resolveTextAlignment = (
  alignment: string | undefined,
): CSSProperties["textAlign"] => {
  switch (alignment) {
    case "lex:pub.leaflet.pages.linearDocument#textAlignRight":
      return "right";
    case "lex:pub.leaflet.pages.linearDocument#textAlignCenter":
      return "center";
    case "lex:pub.leaflet.pages.linearDocument#textAlignJustify":
      return "justify";
    case "lex:pub.leaflet.pages.linearDocument#textAlignLeft":
      return "left";
    default:
      return undefined;
  }
};

// Map the lexicon's alignment token to a simple left/center/right value
// usable as an HTML `align` attribute. `justify` falls through to `left`
// to match published web behavior (`justify-start` flex). For buttons and
// images we default to `center` when alignment is unset, matching
// PostContent.tsx.
const resolveBlockAlignment = (
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
          textAlign: resolveTextAlignment(alignment),
        }}
      >
        {block.plaintext ? (
          <RichTextSpans
            plaintext={block.plaintext}
            facets={block.facets}
            theme={theme}
            assetsBaseUrl={assetsBaseUrl}
          />
        ) : (
          " "
        )}
      </ReactEmailText>
    );
  }
  if (PubLeafletBlocksHeader.isMain(block)) {
    const level = Math.min(3, Math.max(1, Math.floor(block.level ?? 1))) as
      | 1
      | 2
      | 3;
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
          textAlign: resolveTextAlignment(alignment),
        }}
      >
        <RichTextSpans
          plaintext={block.plaintext}
          facets={block.facets}
          theme={theme}
          assetsBaseUrl={assetsBaseUrl}
        />
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
                textAlign: resolveTextAlignment(alignment),
              }}
            >
              <RichTextSpans
                plaintext={block.plaintext}
                facets={block.facets}
                theme={theme}
                assetsBaseUrl={assetsBaseUrl}
              />
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
      <ImageBlock
        src={src}
        alt={block.alt ?? ""}
        naturalWidth={naturalWidth}
        align={resolveBlockAlignment(alignment)}
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
        align={resolveBlockAlignment(alignment)}
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
        textAlign={resolveTextAlignment(alignment)}
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
        textAlign={resolveTextAlignment(alignment)}
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
  const fontSize = props.as === "h1" ? 26 : props.as === "h2" ? 18 : 16;
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

const listItemContent = (
  item: ListItem,
): { plaintext: string; facets?: PubLeafletRichtextFacet.Main[] } => {
  const content = item.content;
  if (PubLeafletBlocksText.isMain(content))
    return { plaintext: content.plaintext, facets: content.facets };
  if (PubLeafletBlocksHeader.isMain(content))
    return { plaintext: content.plaintext, facets: content.facets };
  return { plaintext: "" };
};

export const List = ({
  items,
  style,
  did,
  assetsBaseUrl,
  theme = defaultEmailTheme,
  textAlign,
}: {
  items: ListItem[];
  style: "ordered" | "unordered";
  did: string;
  assetsBaseUrl: string;
  theme?: EmailTheme;
  textAlign?: CSSProperties["textAlign"];
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
          textAlign,
        }}
      >
        {items.map((item, i) => {
          const { plaintext, facets } = listItemContent(item);
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
                  ? `${item.checked ? "☑ " : "☐ "}`
                  : null}
                <RichTextSpans
                  plaintext={plaintext}
                  facets={facets}
                  theme={theme}
                  assetsBaseUrl={assetsBaseUrl}
                />
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
  // Each column wraps its content in a single `display: block` <Link> so
  // the entire padded area — text column and image column — is clickable.
  // Two anchors instead of one outer anchor keeps the markup table-friendly
  // for Outlook (which dislikes <a> wrapping <table>).
  const cellLinkStyle: CSSProperties = {
    color: "inherit",
    display: "block",
    textDecoration: "none",
  };
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
            verticalAlign: "top",
            // Long URL-like titles or domains have no break opportunities
            // and would otherwise force the column wider than the card.
            wordBreak: "break-word",
          }}
        >
          <Link href={url} style={{ ...cellLinkStyle, padding: "8px 12px" }}>
            <span
              style={{
                color: theme.primary,
                display: "block",
                fontFamily: theme.bodyFont,
                fontWeight: "bold",
                fontSize: 16,
                wordBreak: "break-word",
              }}
            >
              {title || displayUrl}
            </span>
            {description ? (
              <span
                style={{
                  color: c.secondary,
                  // 2-line clamp matches the editor's `line-clamp-2`.
                  // -webkit-line-clamp works in Apple Mail / iOS / Gmail;
                  // Outlook ignores it but max-height + overflow still
                  // truncates (just without an ellipsis).
                  display: "-webkit-box",
                  fontFamily: theme.bodyFont,
                  fontSize: 16,
                  lineHeight: 1.4,
                  marginTop: 4,
                  maxHeight: "2.8em",
                  overflow: "hidden",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  wordBreak: "break-word",
                }}
              >
                {description}
              </span>
            ) : null}
            <span
              style={{
                color: theme.accentBackground,
                display: "block",
                fontFamily: theme.bodyFont,
                fontSize: 14,
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
        {previewSrc ? (
          <Column
            style={{
              verticalAlign: "top",
              width: 112,
            }}
          >
            <Link
              href={url}
              style={{ ...cellLinkStyle, padding: "8px 8px 8px 0" }}
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
            </Link>
          </Column>
        ) : null}
      </Row>
    </Section>
  );
};

export const ImageBlock = ({
  src,
  alt,
  naturalWidth,
  align = "center",
}: {
  src: string;
  alt?: string;
  naturalWidth?: number;
  align?: "left" | "center" | "right";
}) => {
  // For images smaller than the column, `margin-left/right: auto` shifts
  // the block within the available space. For images that already fill
  // the column (large naturals or no natural width), the auto margins
  // collapse and alignment has no visible effect — which matches the
  // web, where a column-wide image can't be "right aligned" either.
  const margin =
    align === "left"
      ? `${BLOCK_MARGIN_TOP}px auto ${BLOCK_MARGIN_BOTTOM}px 0`
      : align === "right"
        ? `${BLOCK_MARGIN_TOP}px 0 ${BLOCK_MARGIN_BOTTOM}px auto`
        : IMAGE_MARGIN;
  return (
    <Img
      src={src}
      alt={alt ?? ""}
      style={{
        display: "block",
        height: "auto",
        margin,
        maxWidth: naturalWidth ? `${naturalWidth}px` : "100%",
        width: "100%",
      }}
    />
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

type Facet = PubLeafletRichtextFacet.Main;
type FacetFeatures = Exclude<Facet["features"], { $type: string }>;

type RichTextSegment = { text: string; features?: FacetFeatures };

function* segments(
  plaintext: string,
  facets: Facet[] | undefined,
): Generator<RichTextSegment, void, void> {
  const text = new UnicodeString(plaintext);
  const sorted = (facets ?? [])
    .filter((f) => f.index.byteStart <= f.index.byteEnd)
    .sort((a, b) => a.index.byteStart - b.index.byteStart);
  if (!sorted.length) {
    yield { text: text.utf16 };
    return;
  }
  let textCursor = 0;
  let facetCursor = 0;
  do {
    const f = sorted[facetCursor];
    if (textCursor < f.index.byteStart) {
      yield { text: text.slice(textCursor, f.index.byteStart) };
    } else if (textCursor > f.index.byteStart) {
      facetCursor++;
      continue;
    }
    if (f.index.byteStart < f.index.byteEnd) {
      const sub = text.slice(f.index.byteStart, f.index.byteEnd);
      if (!sub.trim()) yield { text: sub };
      else yield { text: sub, features: f.features };
    }
    textCursor = f.index.byteEnd;
    facetCursor++;
  } while (facetCursor < sorted.length);
  if (textCursor < text.length) {
    yield { text: text.slice(textCursor, text.length) };
  }
}

const renderTextWithBreaks = (text: string, key: string): React.ReactNode => {
  const parts = text.split("\n");
  if (parts.length === 1) return text;
  return parts.flatMap((part, i) =>
    i < parts.length - 1 ? [part, <br key={`${key}-br-${i}`} />] : [part],
  );
};

const resolveAtMentionHref = (
  feature: { atURI: string; href?: string },
  assetsBaseUrl: string,
): string => {
  if (feature.href) return feature.href;
  const path = atUriToUrl(feature.atURI);
  // atUriToUrl returns either an absolute http(s) URL or a leading-slash
  // path; absolutize relative paths against assetsBaseUrl so the link works
  // in mail clients that don't have a base.
  try {
    return new URL(path, assetsBaseUrl).toString();
  } catch {
    return path;
  }
};

export const RichTextSpans = ({
  plaintext,
  facets,
  theme,
  assetsBaseUrl,
}: {
  plaintext: string;
  facets?: PubLeafletRichtextFacet.Main[];
  theme: EmailTheme;
  assetsBaseUrl: string;
}) => {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  for (const seg of segments(plaintext, facets)) {
    const key = `s${i++}`;
    const features = seg.features;
    const link = features?.find(PubLeafletRichtextFacet.isLink);
    const didMention = features?.find(PubLeafletRichtextFacet.isDidMention);
    const atMention = features?.find(PubLeafletRichtextFacet.isAtMention);
    const isBold = !!features?.find(PubLeafletRichtextFacet.isBold);
    const isItalic = !!features?.find(PubLeafletRichtextFacet.isItalic);
    const isUnderline = !!features?.find(PubLeafletRichtextFacet.isUnderline);
    const isStrikethrough = !!features?.find(
      PubLeafletRichtextFacet.isStrikethrough,
    );
    const isCode = !!features?.find(PubLeafletRichtextFacet.isCode);
    const isHighlight = !!features?.find(PubLeafletRichtextFacet.isHighlight);

    const decorations: string[] = [];
    if (isUnderline) decorations.push("underline");
    if (isStrikethrough) decorations.push("line-through");

    const baseStyle: CSSProperties = {
      fontWeight: isBold ? "bold" : undefined,
      fontStyle: isItalic ? "italic" : undefined,
      textDecoration: decorations.length ? decorations.join(" ") : undefined,
      backgroundColor: isCode
        ? "rgba(0,0,0,0.06)"
        : isHighlight
          ? "#fff3a3"
          : undefined,
      fontFamily: isCode ? "monospace" : undefined,
      padding: isCode ? "1px 4px" : undefined,
      borderRadius: isCode ? 3 : undefined,
    };

    const content = renderTextWithBreaks(seg.text, key);

    if (didMention) {
      nodes.push(
        <Link
          key={key}
          href={didToBlueskyUrl(didMention.did)}
          style={{
            ...baseStyle,
            color: theme.accentBackground,
            textDecoration: baseStyle.textDecoration ?? "none",
          }}
        >
          {content}
        </Link>,
      );
    } else if (atMention) {
      nodes.push(
        <Link
          key={key}
          href={resolveAtMentionHref(atMention, assetsBaseUrl)}
          style={{
            ...baseStyle,
            color: theme.accentBackground,
            textDecoration: baseStyle.textDecoration ?? "none",
          }}
        >
          {content}
        </Link>,
      );
    } else if (link) {
      nodes.push(
        <Link
          key={key}
          href={link.uri.trim()}
          style={{
            ...baseStyle,
            color: theme.accentBackground,
            textDecoration: baseStyle.textDecoration ?? "underline",
          }}
        >
          {content}
        </Link>,
      );
    } else if (
      isBold ||
      isItalic ||
      isUnderline ||
      isStrikethrough ||
      isCode ||
      isHighlight
    ) {
      nodes.push(
        <span key={key} style={baseStyle}>
          {content}
        </span>,
      );
    } else {
      nodes.push(<React.Fragment key={key}>{content}</React.Fragment>);
    }
  }
  return <>{nodes}</>;
};
