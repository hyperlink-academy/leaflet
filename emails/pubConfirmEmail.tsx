import {
  Body,
  Column,
  Container,
  Html,
  Img,
  Link,
  Row,
  Tailwind,
} from "@react-email/components";
import { Text, Heading } from "./post";
import {
  confirmEmailTailwindConfig,
  LeafletWatermark,
  MailHead,
  makeStaticUrl,
} from "./shared";

export const PubConfirmEmail = (props: {
  code?: string;
  assetsBaseUrl?: string;
  publicationName?: string;
  publicationUrl?: string;
}) => {
  const staticUrl = makeStaticUrl(
    props.assetsBaseUrl ?? "https://leaflet.pub",
  );
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
            <Text noPadding className="font-bold text-secondary">
              Thank you for subscribing to
            </Text>
            <Row className="w-fit mt-1">
              <Column width="24px">
                <Img
                  width={24}
                  height={24}
                  src={staticUrl("leaflet.png")}
                  className="rounded-full"
                />
              </Column>
              <Column width={"8px"} />

              <Column>
                {props.publicationUrl ? (
                  <Link
                    href={props.publicationUrl}
                    className="!text-primary !no-underline"
                  >
                    <Heading noPadding as="h2">
                      {props.publicationName ?? "Leaflet Explorers"}
                    </Heading>
                  </Link>
                ) : (
                  <Heading noPadding as="h2">
                    {props.publicationName ?? "Leaflet Explorers"}
                  </Heading>
                )}
              </Column>
            </Row>
            <Text className="!mt-6 !mb-1 text-secondary">
              Verify your email with this code
            </Text>
            <Container className="bg-border-light rounded-md w-fit px-2 py-1">
              <Heading noPadding as="h1">
                {props.code ?? "000000"}
              </Heading>
            </Container>
          </Column>
        </Row>
        <LeafletWatermark staticUrl={staticUrl} />
      </Body>
    </Tailwind>
  </Html>
  );
};
export default PubConfirmEmail;
