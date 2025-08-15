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
} from "@react-email/components";
import { Tailwind, pixelBasedPreset } from "@react-email/components";
import { LeafletWatermark } from "./post";

export const ConfirmEmail = (props: {}) => (
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
          <Text>Thank you for subscribing to</Text>
          <Text> [[PUB NAME HERE]]</Text>
          <Text>Here is your verification code</Text>
          <Container>
            <Heading as="h2">000000</Heading>
          </Container>

          <LeafletWatermark />
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
export default ConfirmEmail;

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
