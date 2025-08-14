import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Text,
  Section,
  Row,
  Button,
  CodeBlock,
  dracula,
} from "@react-email/components";
import { Tailwind, pixelBasedPreset } from "@react-email/components";

let borderless = false;

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
      <Body className={`bg-bg-leaflet font-sans p-2 sm:px-4 sm:py-6 !m-0 `}>
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

          <Heading as="h1" className={`${h1} !mt-0 !mb-0`}>
            Post Title Here
          </Heading>
          <Text className={`${secondary} italic !mb-0 !mt-1`}>
            Hello this is a description of everything that is to come
          </Text>

          <Section className={`${tertiary} text-sm !mb-7 !mt-3`}>
            <Row>
              <Column width="auto">celine | Jun 23, 2025 </Column>
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
            <Text className={primary}>
              This would be the post. I'll give it a little lorem ipsum to make
              it look longer so i don't forget which thing is what.
            </Text>
            <Text className={primary}>
              Here's what an image block looks like. It also needs to align if
              you have a small picture. Let's see what that looks like. I will
              need to import a new one and that sounds like so much work but
              whatever, it's easy actually im just lazy
            </Text>
            <Img width="100%" src="/static/test.jpg" className={`${image}`} />
            <Text className={primary}>And here we have all the Headers</Text>
            <Heading as="h1" className={h1}>
              This is an Title
            </Heading>
            <Text className={primary}>
              We'll keep it nice an separate to i can see what it looks like.
              After all i want this to look like a real text document.
            </Text>

            <Heading as="h2" className={h2}>
              And a Header
            </Heading>
            <Text className={primary}>
              If i didn't do this it would be difficult to know waht things look
              like so its important to get jiggy with the flavor text
            </Text>
            <Heading as="h2" className={h3}>
              And finally a SubHeader
            </Heading>
            <Text className={primary}>
              It ain't easy to be jiggy but I make it look breezy. Like you
              rhymes are cheesy, I'm allergic they make me sneezy. Besides,
              relying on rhymes is sleazy like yo, it's measely.
            </Text>

            <Text className={primary}>how about lists????? </Text>
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

            <Text className={primary}>and blockquote!!! </Text>
            <Row className={blockPadding}>
              <Column className="!my-0 w-[2px] bg-border" />
              <Column className="w-2" />
              <Column>
                <Text className="my-0.5 text-base">
                  Hi this is some text. I want to make it wrap this so that it's
                  multiline but idk how long that will end up being
                </Text>
              </Column>
            </Row>
            <Text className={primary}>code block??? </Text>
            <CodeBlock
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
            <Text className={primary}>
              I don't even know if we an do external link but why not give it a
              go.{" "}
            </Text>

            <Row
              border={1}
              className={`${blockPadding} h-[104px] border-accent-contrast rounded-lg !p-0 border-solid`}
            >
              <Column
                style={{ verticalAlign: "top" }}
                className="border-transparent py-1 px-2 "
              >
                <Text className={`text-base font-bold !my-0 `}>
                  Link Title Here
                </Text>
                {/* what happens if the description is super long? is there
                anyway to truncate it? overflow is only partially supported by
                email */}
                <Text className={`text-base text-secondary !my-0`}>
                  Description on the link if such a thing is applicable.
                </Text>
                <Text className={`text-accent-contrast italic text-sm !my-0 `}>
                  www.example.com
                </Text>
              </Column>
              <Column className="border-none w-24 pr-2 pt-2">
                <Container className="bg-test rounded-t-md w-full h-full" />
              </Column>
            </Row>

            <Text className={primary}>
              can't forget about the horizontal rule
            </Text>

            <Hr className="border-border-light my-3" />

            <Text className={primary}>
              and what if we don't support it? like math and code blocks? though
              maybe we should support code? there's a component after all.
            </Text>
            <Container
              className={`bg-border-light h-20 rounded-md text-tertiary ${blockPadding}`}
            >
              <Text className={"text-tertiary text-sm text-center my-0 italic"}>
                This media isn't supported in email...
              </Text>
              <Text className="text-center my-0">
                <Link
                  className={`w-full text-accent-contrast text-sm text-center font-bold`}
                >
                  See full post
                </Link>
              </Text>
            </Container>
          </Section>

          <Text className="my-0 text-center leading-5">
            <Button className={`${link} font-bold text-sm leading-5 !my-0`}>
              See Full Post
            </Button>
          </Text>
          <Text className="my-0 text-center leading-5">
            <Button className={`${tertiary} text-sm leading-5 !my-0`}>
              Unsubscribe
            </Button>
          </Text>
        </Container>
        <Hr className="border-border-light mt-6 mb-3" />

        <Container className={` w-fit `}>
          <Button href="/">
            <Row className={`${tertiary} italic text-sm`}>
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
      </Body>
    </Tailwind>
  </Html>
);
export default PostEmail;

const blockPadding = "mt-1 mb-3 sm:mb-4";
const headerPadding = "mt-1 mb-0";

const h1 = `text-xl font-bold ${blockPadding}`;
const h2 = `text-lg font-bold ${headerPadding}`;
const h3 = `text-base font-bold text-secondary ${headerPadding}`;
const primary = `text-base text-primary ${blockPadding}`;
const secondary = `text-base text-secondary ${blockPadding}`;
const tertiary = `text-base text-tertiary ${blockPadding}`;
const list = `my-0 !pl-6`;
const listItem = `${headerPadding} !ml-2`;
const link = `text-base text-accent-contrast ${blockPadding}`;
const image = `${blockPadding} text-center`;
