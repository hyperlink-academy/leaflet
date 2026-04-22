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
import { Tailwind, pixelBasedPreset } from "@react-email/components";
import React from "react";
import type { EmailBlock, EmailListItem } from "src/utils/postToEmailBlocks";

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
  blocks: EmailBlock[];
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
  blocks: [
    {
      type: "text",
      plaintext:
        "This would be the post. I'll give it a little lorem ipsum to make it look longer so i don't forget which thing is what.",
    },
    { type: "heading", level: 1, plaintext: "This is a Title" },
    {
      type: "text",
      plaintext: "We'll keep it nice and separate so we can see what it looks like.",
    },
    { type: "heading", level: 2, plaintext: "And a Header" },
    {
      type: "list",
      style: "unordered",
      items: [
        { plaintext: "fruits", children: [
          { type: "list", style: "unordered", items: [
            { plaintext: "apple" },
            { plaintext: "banana" },
          ] },
        ] },
        { plaintext: "veggies" },
      ],
    },
    { type: "blockquote", plaintext: "A quote of some kind." },
    { type: "code", code: "const x = 1;", language: "javascript" },
    {
      type: "link",
      url: "https://example.com",
      title: "Link Title Here",
      description: "Description on the link",
    },
    { type: "horizontal-rule" },
    { type: "unsupported", kind: "math" },
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
              {p.blocks.map((block, i) => (
                <BlockRenderer key={i} block={block} assetsBaseUrl={p.assetsBaseUrl} />
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
  assetsBaseUrl,
}: {
  block: EmailBlock;
  assetsBaseUrl: string;
}) => {
  switch (block.type) {
    case "text":
      return <Text>{block.plaintext || " "}</Text>;
    case "heading":
      return (
        <Heading as={`h${block.level}` as "h1" | "h2" | "h3"}>
          {block.plaintext}
        </Heading>
      );
    case "blockquote":
      return (
        <Row className={blockPadding}>
          <Column className="!my-0 w-[2px] bg-border" />
          <Column className="w-2" />
          <Column>
            <Text className="!my-0.5">{block.plaintext}</Text>
          </Column>
        </Row>
      );
    case "code":
      return <CodeBlock code={block.code} language={block.language} />;
    case "image":
      // Deliberately no numeric `width`/`height` HTML attributes: Outlook
      // honors those over CSS `max-width`, so a 1200px natural-size photo
      // would blow out our 28rem container. `max-width: <natural>px` keeps
      // smaller images from being upscaled.
      return (
        <Img
          src={block.src}
          alt={block.alt ?? ""}
          className={`${blockPadding} mx-auto`}
          style={{
            display: "block",
            width: "100%",
            maxWidth: block.width ? `${block.width}px` : "100%",
            height: "auto",
          }}
        />
      );
    case "link":
      return (
        <LinkBlock
          url={block.url}
          title={block.title}
          description={block.description}
          previewSrc={block.previewSrc}
        />
      );
    case "horizontal-rule":
      return <Hr className="border-border-light my-3" />;
    case "list":
      return <List items={block.items} style={block.style} />;
    case "unsupported":
      return <BlockNotSupported />;
  }
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

export const List = ({
  items,
  style,
}: {
  items: EmailListItem[];
  style: "ordered" | "unordered";
}) => {
  const listClass = `my-0 !pl-6`;
  const listItemClass = `${headingPadding} !ml-2`;
  const Tag = style === "ordered" ? "ol" : "ul";
  return (
    <Section className={`${blockPadding} !-mt-1`}>
      <Tag className={listClass}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <li className={listItemClass}>
              {typeof item.checked === "boolean"
                ? `${item.checked ? "☑ " : "☐ "}${item.plaintext}`
                : item.plaintext}
            </li>
            {item.children?.map((child, j) => (
              <BlockRenderer key={j} block={child} assetsBaseUrl="" />
            ))}
          </React.Fragment>
        ))}
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
      language={language || "text"}
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
