import {
  Body,
  Column,
  Container,
  Html,
  Img,
  Row,
} from "@react-email/components";
import { Tailwind } from "@react-email/components";
import { Text, Heading } from "./post";
import {
  confirmEmailTailwindConfig,
  MailHead,
  makeStaticUrl,
} from "./shared";

export const LeafletConfirmEmail = (props: {
  code?: string;
  assetsBaseUrl?: string;
  title?: string;
  message?: string;
}) => {
  const leafletSrc = makeStaticUrl(
    props.assetsBaseUrl ?? "https://leaflet.pub",
  )("leaflet.png");
  const title = props.title ?? "Welcome to Leaflet!";
  const message = props.message ?? "Verify your email with this code";
  return (
  <Html>
    <Tailwind config={confirmEmailTailwindConfig}>
      <MailHead />

      <Body className={`bg-bg-page font-sans px-2 py-4 !m-0 `}>
        <Row
          border={1}
          className={`w-fit max-w-full bg-transparent rounded-lg !border !border-border !border-solid  text-center px-6 py-6 mb-2`}
        >
          <Column className="border-transparent">
            <Row className="w-fit mt-1 text-center">
              <Img
                width={56}
                height={56}
                src={leafletSrc}
                className="mx-auto mb-2"
              />

              <Column>
                <Heading noPadding as="h2">
                  {title}{" "}
                </Heading>
              </Column>
            </Row>
            <Text className="!mt-6 !mb-1 text-secondary">
              {message}
            </Text>
            <Container className="bg-border-light rounded-md w-fit px-2 py-1">
              <Heading noPadding as="h1">
                {props.code ?? "000000"}
              </Heading>
            </Container>
          </Column>
        </Row>
      </Body>
    </Tailwind>
  </Html>
  );
};
export default LeafletConfirmEmail;
