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
import { Block } from "components/Blocks/Block";
import React from "react";

export const PostEmail = (props: {}) => (
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

            //TEXT COLORS.
            primary: "rgb(39, 39, 39)",
            secondary:
              "color-mix(in oklab, rgb(39, 39, 39),  rgb(255, 255, 255) 25%)",
            tertiary:
              "color-mix(in oklab, rgb(39, 39, 39), rgb(255, 255, 255) 55%)",
            border:
              "color-mix(in oklab, rgb(39, 39, 39), rgb(255, 255, 255) 75%)",
            "border-light":
              "color-mix(in oklab, rgb(39, 39, 39), rgb(255, 255, 255) 85%)",

            white: "#FFFFFF",

            //ACCENT COLORS
            "accent-1": "rgb(0, 0, 225)",
            "accent-2": "rgb(255, 255, 255;)",
            "accent-contrast": "rgb(0, 0, 225)",

            //BG COLORS (defined as css variables in global.css)
            "bg-leaflet": "rgb(240, 247, 250)",
            "bg-page": "rgba(255, 255, 255, 1)",

            // HIGHLIGHT COLORS
            "highlight-1": "rgb(255, 177, 177)",
            "highlight-2": "rgb(253, 245, 203)",
            "highlight-3": "rgb(255, 205, 195)",

            //DO NOT USE IN PRODUCTION. Test colors to aid development, ie, setting bg color on element to see edges of div. DO. NOT. USE. IN. PRODUCTION
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
              sans: ["Verdana"],
              serif: ["Georgia"],
            },
          },
        },
      }}
    >
      <Head />
      <Body className={`bg-bg-page font-sans p-2 sm:px-4 sm:py-6 !m-0 `}>
        <Container className={`bg-transparent rounded-lg border border-border`}>
          <Button href="/" className={`${link} font-bold !my-0`}>
            <Row>
              <Column width="16px">
                <Img
                  width={16}
                  height={16}
                  src="/static/test.jpg"
                  className="rounded-full"
                />
              </Column>
              <Column width={"4px"} />

              <Column>Pub Here</Column>
            </Row>
          </Button>

          <Heading as="h1" noPadding>
            Post Title Here
          </Heading>
          <Text noPadding className={`text-secondary italic pt-1`}>
            Hello this is a description of everything that is to come
          </Text>

          <Section className={`postActions !mb-7 !mt-3`}>
            <Row>
              <Column width="auto">
                <Text className="text-sm text-tertiary">
                  celine | Jun 23, 2025
                </Text>
              </Column>
              <Column style={{ width: "16px" }}>
                <Button href="/">
                  <Img width={16} height={16} src="/static/quote.png" />
                </Button>
              </Column>
              <Column width="8px" />
              <Column style={{ width: "16px" }}>
                <Button href="/">
                  <Img width={16} height={16} src="/static/comment.png" />
                </Button>
              </Column>
              <Column width="10px" />
              <Column style={{ width: "16px" }}>
                <Button href="/">
                  <Img width={16} height={16} src="/static/external-link.png" />
                </Button>
              </Column>

              <Column width="inherit" />
            </Row>
          </Section>
          <Section className="postContent">
            <Text>
              This would be the post. I'll give it a little lorem ipsum to make
              it look longer so i don't forget which thing is what.
            </Text>
            <Text>
              Here's what an image block looks like. It also needs to align if
              you have a small picture. Let's see what that looks like. I will
              need to import a new one and that sounds like so much work but
              whatever, it's easy actually im just lazy
            </Text>
            <Img width="100%" src="/static/test.jpg" className={`${image}`} />
            <Text>And here we have all the Headers</Text>
            <Heading as="h1">This is an Title</Heading>
            <Text>
              We'll keep it nice an separate to i can see what it looks like.
              After all i want this to look like a real text document.
            </Text>

            <Heading as="h2">And a Header</Heading>
            <Text>
              If i didn't do this it would be difficult to know waht things look
              like so its important to get jiggy with the flavor text
            </Text>
            <Heading as="h3">And finally a SubHeader</Heading>
            <Text>
              It ain't easy to be jiggy but I make it look breezy. Like you
              rhymes are cheesy, I'm allergic they make me sneezy. Besides,
              relying on rhymes is sleazy like yo, it's measely.
            </Text>

            <Text>how about lists????? </Text>
            <List />

            <Text>and blockquote!!! </Text>
            <Row className={blockPadding}>
              <Column className="!my-0 w-[2px] bg-border" />
              <Column className="w-2" />
              <Column>
                <Text className="!my-0.5">
                  Hi this is some text. I want to make it wrap this so that it's
                  multiline but idk how long that will end up being
                </Text>
              </Column>
            </Row>
            <Text>code block??? </Text>
            <CodeBlock />

            <Text>
              I don't even know if we an do external link but why not give it a
              go.
            </Text>
            <LinkBlock />

            <Text>can't forget about the horizontal rule</Text>

            <Hr className="border-border-light my-3" />

            <Text>
              and what if we don't support it? like math and code blocks? though
              maybe we should support code? there's a component after all.
            </Text>
            <BlockNotSupported />
          </Section>
          <Section className="pt-4">
            <Text noPadding className="text-center leading-5">
              <Button className={`${link} font-bold text-sm leading-5 !my-0`}>
                See Full Post
              </Button>
            </Text>
            <Text
              noPadding
              className="text-sm text-tertiary text-center leading-5"
            >
              <Button className={`leading-5 !my-0`}>Unsubscribe</Button>
            </Text>
          </Section>
        </Container>
        <Hr className="border-border-light my-3" />

        <LeafletWatermark />
      </Body>
    </Tailwind>
  </Html>
);
export default PostEmail;

export const LeafletWatermark = () => {
  return (
    <Container className={` w-fit `}>
      <Button href="/">
        <Row className={`text-tertiary italic text-sm`}>
          <Column style={{ width: "16px" }}>
            <Img width={16} height={16} src="/static/leaflet.png" />
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
      className={`text-primary ${props.small ? "text-sm" : "text-base"} ${props.noPadding ? "!my-0" : blockPadding} ${props.className}`}
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
      className={` font-bold ${props.noPadding ? "!my-0" : headingPadding} ${props.as === "h1" ? "text-xl" : props.as === "h2" ? "text-lg" : "text-base text-secondary"}`}
    >
      {props.children}
    </ReactEmailHeading>
  );
};

export const List = () => {
  let list = `my-0 !pl-6`;
  let listItem = `${headingPadding} !ml-2`;
  return (
    <Section className={`${blockPadding} !-mt-1`}>
      <ul className={list}>
        <li className={listItem}>fruits</li>
        <ul className={list}>
          <li className={listItem}>apple</li>
          <li className={listItem}>banana</li>
          <li className={listItem}>loop</li>
        </ul>
        <li className={listItem}>veggies</li>
        <li className={listItem}>other</li>
      </ul>
    </Section>
  );
};

export const LinkBlock = () => {
  return (
    <Row
      border={1}
      className={`${blockPadding} h-[104px] border-accent-contrast rounded-lg !p-0 border-solid`}
    >
      <Column
        style={{ verticalAlign: "top" }}
        className="border-transparent py-1 px-2 "
      >
        <Text noPadding className={`font-bold`}>
          Link Title Here
        </Text>
        {/* what happens if the description is super long? is there
        anyway to truncate it? overflow is only partially supported by
        email */}
        <Text noPadding className={`text-secondary`}>
          Description on the link if such a thing is applicable.
        </Text>
        <Text small noPadding className={`text-accent-contrast italic`}>
          www.example.com
        </Text>
      </Column>
      <Column className="border-none w-28 pr-2 pt-2">
        <Container className="bg-test rounded-t-md w-full h-full" />
      </Column>
    </Row>
  );
};

export const CodeBlock = () => {
  return (
    <ReactEmailCodeBlock
      className={`${blockPadding} !p-2 rounded-md border border-light`}
      code={`export default async (req, res) => {
try {
const html = await renderAsync(
EmailTemplate({ firstName: 'John' })
);
return NextResponse.json({ html });
} catch (error) {
return NextResponse.json({ error });
}
}`}
      theme={dracula}
      language="javascript"
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

const image = `${blockPadding} text-center`;
