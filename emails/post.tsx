import {
  Body,
  Column,
  Container,
  Head,
  Heading as ReactEmailHeading,
  Hr,
  Html,
  Img,
  Link,
  Text as ReactEmailText,
  Section,
  Row,
  Button,
  CodeBlock as ReactEmailCodeBlock,
  dracula,
} from "@react-email/components";
import type { PrismLanguage } from "@react-email/code-block";
import { Tailwind, pixelBasedPreset } from "@react-email/components";
import React from "react";
import {
  PubLeafletBlocksBlockquote,
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

export type EmailTheme = {
  primary: string;
  pageBackground: string;
  backgroundColor: string;
  accentBackground: string;
  accentText: string;
  headingFont: string;
  bodyFont: string;
};

export const defaultEmailTheme: EmailTheme = {
  primary: "rgb(39, 39, 39)",
  pageBackground: "rgb(255, 255, 255)",
  backgroundColor: "rgb(240, 247, 250)",
  accentBackground: "rgb(0, 0, 225)",
  accentText: "rgb(255, 255, 255)",
  headingFont: "Georgia, serif",
  bodyFont: "Verdana, sans-serif",
};

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
      block: { $type: "pub.leaflet.blocks.horizontalRule" },
    },
    {
      $type: "pub.leaflet.pages.linearDocument#block",
      block: { $type: "pub.leaflet.blocks.math" },
    },
  ],
};

export const PostEmail = (props: Partial<PostEmailProps> = {}) => {
  const p: PostEmailProps = { ...defaultProps, ...props };
  const theme = p.theme ?? defaultEmailTheme;
  const staticUrl = (filename: string) =>
    `${p.assetsBaseUrl.replace(/\/$/, "")}/email-assets/${filename}`;
  const byline = [p.authorName, p.publishedAtLabel].filter(Boolean).join(" | ");

  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            screens: {
              sm: "640px",
              md: "960px",
              lg: "1280px",
            },
            borderRadius: {
              none: "0",
              md: "0.25rem",
              lg: "0.5rem",
              full: "9999px",
            },
            colors: {
              inherit: "inherit",
              transparent: "transparent",
              current: "currentColor",
              primary: theme.primary,
              secondary: `color-mix(in oklab, ${theme.primary}, ${theme.pageBackground} 25%)`,
              tertiary: `color-mix(in oklab, ${theme.primary}, ${theme.pageBackground} 55%)`,
              border: `color-mix(in oklab, ${theme.primary}, ${theme.pageBackground} 75%)`,
              "border-light": `color-mix(in oklab, ${theme.primary}, ${theme.pageBackground} 85%)`,
              white: "#FFFFFF",
              "accent-1": theme.accentBackground,
              "accent-2": theme.accentText,
              "accent-contrast": theme.accentBackground,
              "bg-leaflet": theme.backgroundColor,
              "bg-page": theme.pageBackground,
              "highlight-1": "rgb(255, 177, 177)",
              "highlight-2": "rgb(253, 245, 203)",
              "highlight-3": "rgb(255, 205, 195)",
              test: "#E18181",
              "test-blue": "#48D1EF",
            },
            fontSize: {
              xs: ".75rem",
              sm: ".875rem",
              base: "1rem",
              lg: "1.125rem",
              xl: "1.625rem",
              "2xl": "2rem",
            },
            extend: {
              fontFamily: {
                sans: [theme.bodyFont],
                serif: [theme.headingFont],
              },
            },
          },
        }}
      >
        <Head />
        <Body className={`bg-bg-leaflet font-sans p-2 sm:px-4 sm:py-6 !m-0 `}>
          <Container
            className={`bg-bg-page rounded-lg border border-border mx-auto px-4 sm:px-6`}
            style={{ maxWidth: "28rem" }}
          >
            <Button
              href={p.publicationUrl}
              className={`${link} font-bold !my-0`}
            >
              {p.publicationName}
            </Button>

            <Heading as="h1" noPadding>
              {p.postTitle}
            </Heading>
            {p.postDescription ? (
              <Text noPadding className={`text-secondary italic pt-1`}>
                {p.postDescription}
              </Text>
            ) : null}

            {byline ? (
              <Section className={`postActions !mb-7 !mt-3`}>
                <Row>
                  <Column width="auto">
                    <Text className="text-sm text-tertiary !my-0">
                      {byline}
                    </Text>
                  </Column>
                  <Column width="12px" />
                  <Column style={{ width: "16px" }}>
                    <Button href={drawerUrl(p.postUrl, "quotes")}>
                      <Img
                        width={16}
                        height={16}
                        src={staticUrl("quote.png")}
                        alt="See quotes"
                      />
                    </Button>
                  </Column>
                  <Column width="8px" />
                  <Column style={{ width: "16px" }}>
                    <Button href={drawerUrl(p.postUrl, "comments")}>
                      <Img
                        width={16}
                        height={16}
                        src={staticUrl("comment.png")}
                        alt="See comments"
                      />
                    </Button>
                  </Column>
                  <Column width="10px" />
                  <Column style={{ width: "16px" }}>
                    <Button href={p.postUrl}>
                      <Img
                        width={16}
                        height={16}
                        src={staticUrl("external-link.png")}
                        alt="Open post"
                      />
                    </Button>
                  </Column>
                  <Column width="inherit" />
                </Row>
              </Section>
            ) : null}
            <Section className="postContent">
              {p.blocks.map((b, i) => (
                <BlockRenderer
                  key={i}
                  block={b.block}
                  did={p.did}
                  assetsBaseUrl={p.assetsBaseUrl}
                />
              ))}
            </Section>
            <Section className="pt-4">
              <Text noPadding className="text-center leading-5">
                <Button
                  href={p.postUrl}
                  className={`${link} font-bold text-sm leading-5 !my-0`}
                >
                  See Full Post
                </Button>
              </Text>
              <Text
                noPadding
                className="text-sm text-tertiary text-center leading-5"
              >
                {p.unsubscribeUrl ? (
                  <Button
                    href={p.unsubscribeUrl}
                    className={`leading-5 !my-0`}
                  >
                    Unsubscribe
                  </Button>
                ) : (
                  <span className={`leading-5 !my-0 italic`}>
                    (preview — not sent to subscribers)
                  </span>
                )}
              </Text>
            </Section>
          </Container>
          <Hr className="border-border-light my-3" />

          <LeafletWatermark staticUrl={staticUrl} />
        </Body>
      </Tailwind>
    </Html>
  );
};
export default PostEmail;

const BlockRenderer = ({
  block,
  did,
  assetsBaseUrl,
}: {
  block: PubLeafletPagesLinearDocument.Block["block"];
  did: string;
  assetsBaseUrl: string;
}) => {
  if (PubLeafletBlocksText.isMain(block)) {
    return <Text>{block.plaintext || " "}</Text>;
  }
  if (PubLeafletBlocksHeader.isMain(block)) {
    const raw = Math.floor(block.level ?? 1);
    const clamped = (raw < 1 ? 1 : raw > 3 ? 3 : raw) as 1 | 2 | 3;
    return <Heading as={`h${clamped}`}>{block.plaintext}</Heading>;
  }
  if (PubLeafletBlocksBlockquote.isMain(block)) {
    return (
      <Row className={blockPadding}>
        <Column className="!my-0 w-[2px] bg-border" />
        <Column className="w-2" />
        <Column>
          <Text className="!my-0.5">{block.plaintext}</Text>
        </Column>
      </Row>
    );
  }
  if (PubLeafletBlocksCode.isMain(block)) {
    return <CodeBlock code={block.plaintext} language={block.language} />;
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
        className={`${blockPadding} mx-auto`}
        style={{
          display: "block",
          width: "100%",
          maxWidth: naturalWidth ? `${naturalWidth}px` : "100%",
          height: "auto",
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
      />
    );
  }
  if (PubLeafletBlocksHorizontalRule.isMain(block)) {
    return <Hr className="border-border-light my-3" />;
  }
  if (PubLeafletBlocksUnorderedList.isMain(block)) {
    return (
      <List items={block.children} style="unordered" did={did} assetsBaseUrl={assetsBaseUrl} />
    );
  }
  if (PubLeafletBlocksOrderedList.isMain(block)) {
    return (
      <List items={block.children} style="ordered" did={did} assetsBaseUrl={assetsBaseUrl} />
    );
  }
  return <BlockNotSupported />;
};

export const LeafletWatermark = ({
  staticUrl,
}: {
  staticUrl?: (filename: string) => string;
} = {}) => {
  const leafletSrc = staticUrl
    ? staticUrl("leaflet.png")
    : "/email-assets/leaflet.png";
  return (
    <Container className={` w-fit `}>
      <Button href="https://leaflet.pub">
        <Row className={`text-tertiary italic text-sm`}>
          <Column style={{ width: "16px" }}>
            <Img width={16} height={16} src={leafletSrc} />
          </Column>
          <Column width="4px" />
          <Column style={{ width: "164px" }}>
            Published with{" "}
            <Link className={`${link} font-bold text-sm`}>Leaflet</Link>
          </Column>
        </Row>
      </Button>
    </Container>
  );
};

const blockPadding = "mt-1 mb-3 sm:mb-4";
const headingPadding = "mt-1 mb-0";
const link = `text-base text-accent-contrast ${blockPadding}`;

export const Text = (props: {
  children: React.ReactNode;
  noPadding?: boolean;
  small?: boolean;
  className?: string;
}) => {
  return (
    <ReactEmailText
      className={`text-primary ${props.small ? "text-sm" : "text-base"} ${props.noPadding ? "!my-0" : blockPadding} ${props.className ?? ""}`}
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
}) => {
  return (
    <ReactEmailHeading
      as={props.as}
      className={`font-serif font-bold ${props.noPadding ? "!my-0" : headingPadding} ${props.as === "h1" ? "text-xl" : props.as === "h2" ? "text-lg" : "text-base text-secondary"} ${props.className ?? ""}`}
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
}: {
  items: ListItem[];
  style: "ordered" | "unordered";
  did: string;
  assetsBaseUrl: string;
}) => {
  const listClass = `my-0 !pl-6`;
  const listItemClass = `${headingPadding} !ml-2`;
  const Tag = style === "ordered" ? "ol" : "ul";
  return (
    <Section className={`${blockPadding} !-mt-1`}>
      <Tag className={listClass}>
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
              <li className={listItemClass}>
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
                />
              ) : null}
              {nestedOrdered && nestedOrdered.length > 0 ? (
                <List
                  items={nestedOrdered}
                  style="ordered"
                  did={did}
                  assetsBaseUrl={assetsBaseUrl}
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
}: {
  url?: string;
  title?: string;
  description?: string;
  previewSrc?: string;
} = {}) => {
  const displayUrl = (() => {
    if (!url) return "www.example.com";
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  return (
    <Row
      border={1}
      className={`${blockPadding} h-[104px] border-accent-contrast rounded-lg !p-0 border-solid`}
    >
      <Column
        style={{ verticalAlign: "top" }}
        className="border-transparent py-1 px-2 "
      >
        <Link href={url}>
          <Text noPadding className={`font-bold`}>
            {title || displayUrl}
          </Text>
        </Link>
        {description ? (
          <Text noPadding className={`text-secondary`}>
            {description}
          </Text>
        ) : null}
        <Text small noPadding className={`text-accent-contrast italic`}>
          {displayUrl}
        </Text>
      </Column>
      {previewSrc ? (
        <Column className="border-none w-28 pr-2 pt-2">
          <Img
            src={previewSrc}
            alt=""
            className="rounded-t-md w-full h-full"
            style={{ objectFit: "cover" }}
          />
        </Column>
      ) : null}
    </Row>
  );
};

export const CodeBlock = ({
  code,
  language,
}: {
  code?: string;
  language?: string;
} = {}) => {
  return (
    <ReactEmailCodeBlock
      className={`${blockPadding} !p-2 rounded-md border border-light`}
      code={code ?? ""}
      theme={dracula}
      language={(language as PrismLanguage) || "text"}
    />
  );
};

export const BlockNotSupported = () => {
  return (
    <Container
      className={`bg-border-light h-20 rounded-md text-tertiary ${blockPadding}`}
    >
      <Text noPadding small className={"text-tertiary text-center italic"}>
        This media isn't supported in email...
      </Text>
      <Text noPadding small className="text-center">
        <Link
          className={`w-full text-accent-contrast text-sm text-center font-bold`}
        >
          See full post
        </Link>
      </Text>
    </Container>
  );
};
