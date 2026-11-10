import {
  Body,
  Container,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  defaultEmailTheme,
  LeafletWatermark,
  MailHead,
  makeStaticUrl,
  resolveColors,
} from "./shared";

export function DigestEmail(props: {
  subject: string;
  period: string;
  items: { label: string; count: number }[];
  note: string;
  assetsBaseUrl?: string;
}) {
  const theme = defaultEmailTheme;
  const colors = resolveColors(theme);
  const staticUrl = makeStaticUrl(props.assetsBaseUrl || "https://leaflet.pub");
  return (
    <Html>
      <MailHead />
      <Preview>{props.subject}</Preview>
      <Body
        style={{
          margin: 0,
          backgroundColor: theme.backgroundColor,
          color: colors.primary,
          fontFamily: theme.bodyFont,
        }}
      >
        <Container
          style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}
        >
          <Section
            style={{
              backgroundColor: theme.pageBackground,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 24,
            }}
          >
            <Img
              src={staticUrl("leaflet.png")}
              alt="Leaflet"
              width={32}
              height={32}
            />
            <Heading
              as="h1"
              style={{
                fontFamily: theme.headingFont,
                fontSize: 28,
                lineHeight: "36px",
                margin: "20px 0 8px",
              }}
            >
              {props.subject}
            </Heading>
            <Text
              style={{
                color: colors.secondary,
                fontSize: 14,
                lineHeight: "22px",
                margin: "0 0 24px",
              }}
            >
              {props.period}
            </Text>
            <table
              cellPadding={0}
              cellSpacing={0}
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: theme.bodyFont,
              }}
              aria-label="New publication activity"
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={{
                      textAlign: "left",
                      padding: "0 0 10px",
                      color: colors.secondary,
                      fontSize: 12,
                    }}
                  >
                    Activity
                  </th>
                  <th
                    scope="col"
                    style={{
                      textAlign: "right",
                      padding: "0 0 10px",
                      color: colors.secondary,
                      fontSize: 12,
                    }}
                  >
                    New
                  </th>
                </tr>
              </thead>
              <tbody>
                {props.items.map((item) => (
                  <tr key={item.label}>
                    <th
                      scope="row"
                      style={{
                        textAlign: "left",
                        fontWeight: "normal",
                        fontSize: 15,
                        padding: "12px 0",
                        borderTop: `1px solid ${colors.borderLight}`,
                      }}
                    >
                      {item.label}
                    </th>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: 20,
                        padding: "12px 0",
                        borderTop: `1px solid ${colors.borderLight}`,
                        color: theme.accentBackground,
                      }}
                    >
                      +{item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Text
              style={{
                fontSize: 12,
                lineHeight: "20px",
                color: colors.tertiary,
                margin: "20px 0 0",
              }}
            >
              Likes are Leaflet recommendations.
              <br />
              {props.note}
            </Text>
          </Section>
          <Section style={{ marginTop: 20 }}>
            <LeafletWatermark staticUrl={staticUrl} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DigestEmail;
