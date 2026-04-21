import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Row,
  Button,
  CodeBlock,
} from "@react-email/components";
import { Text, Heading } from "./post";
import { Tailwind, pixelBasedPreset } from "@react-email/components";
import { LeafletWatermark } from "./post";

export const PubConfirmEmail = (props: {}) => (
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

      <Body className={`bg-bg-page font-sans px-2 py-4 !m-0 `}>
        <Row
          border={1}
          className={`w-fit max-w-full bg-transparent rounded-lg !border !border-border !border-solid  text-center px-6 py-6 mb-2`}
        >
          <Column className="border-transparent">
            <Text noPadding className="font-bold text-secondary">
              Thank you for subscribing to
            </Text>
            <Row className="w-fit mt-1">
              <Column width="24px">
                <Img
                  width={24}
                  height={24}
                  src="/static/test.jpg"
                  className="rounded-full"
                />
              </Column>
              <Column width={"8px"} />

              <Column>
                <Heading noPadding as="h2">
                  Leaflet Explorers
                </Heading>
              </Column>
            </Row>
            <Text className="!mt-6 !mb-1 text-secondary">
              Verify your email with this code
            </Text>
            <Container className="bg-border-light rounded-md w-fit px-2 py-1">
              <Heading noPadding as="h1">
                000000
              </Heading>
            </Container>
          </Column>
        </Row>
        <LeafletWatermark />
      </Body>
    </Tailwind>
  </Html>
);
export default PubConfirmEmail;
