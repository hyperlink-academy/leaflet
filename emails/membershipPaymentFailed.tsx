import { Body, Column, Html, Link, Row, Tailwind } from "@react-email/components";
import { Text, Heading } from "./post";
import {
  confirmEmailTailwindConfig,
  LeafletWatermark,
  MailHead,
  makeStaticUrl,
} from "./shared";

export const MembershipPaymentFailed = (props: {
  assetsBaseUrl?: string;
  publicationName?: string;
  updateCardUrl?: string;
}) => {
  const staticUrl = makeStaticUrl(props.assetsBaseUrl ?? "https://leaflet.pub");
  const updateCardUrl = props.updateCardUrl ?? "https://leaflet.pub/memberships";
  return (
    <Html>
      <Tailwind config={confirmEmailTailwindConfig}>
        <MailHead />
        <Body className={`bg-bg-page font-sans px-2 py-4 !m-0 `}>
          <Row
            border={1}
            className={`w-fit max-w-full bg-transparent rounded-lg !border !border-border !border-solid text-center px-6 py-6 mb-2`}
          >
            <Column className="border-transparent">
              <Heading noPadding as="h2">
                We couldn't renew your membership
              </Heading>
              <Text className="!mt-3 text-secondary">
                Your latest payment for{" "}
                <span className="font-bold">
                  {props.publicationName ?? "a publication"}
                </span>{" "}
                didn't go through, so your members-only access has paused.
              </Text>
              <Text className="!mt-2 text-secondary">
                Update your card to restore access — we'll retry the payment
                right away.
              </Text>
              <Link
                href={updateCardUrl}
                className="!text-accent-contrast font-bold !mt-4 inline-block"
              >
                Update your card
              </Link>
            </Column>
          </Row>
          <LeafletWatermark staticUrl={staticUrl} />
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MembershipPaymentFailed;
