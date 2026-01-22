import { ViewportSizeLayout } from "components/ViewportSizeLayout";
import { InitialPageLoad } from "../components/InitialPageLoadProvider";
import { ServiceWorker } from "../components/ServiceWorker";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import localFont from "next/font/local";
import { PopUpProvider } from "components/Toast";
import { IdentityProviderServer } from "components/IdentityProviderServer";
import { headers } from "next/headers";
import { RequestHeadersProvider } from "components/Providers/RequestHeadersProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";

export const metadata = {
  title: "Leaflet",
  description: "tiny interconnected social documents",
  metadataBase: new URL(`https://leaflet.pub`),
  appleWebApp: {
    title: "Leaflet",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport = {
  themeColor: "#ffffff",
  minimumScale: 1,
  initialScale: 1,
  maximumScale: 1,
  width: "device-width",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const preferredRegion = ["sfo1"];

const quattro = localFont({
  src: [
    {
      path: "../public/fonts/iaw-quattro-vf.woff2",
      style: "normal",
    },
    {
      path: "../public/fonts/iaw-quattro-vf-Italic.woff2",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-quattro",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let headersList = await headers();
  let ipLocation = headersList.get("X-Vercel-IP-Country");
  let acceptLanguage = headersList.get("accept-language");
  let ipTimezone = headersList.get("X-Vercel-IP-Timezone");
  return (
    <html suppressHydrationWarning lang="en" className={`${quattro.variable}`}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            let listener = () => {
              let el = document.querySelector(":root");
              el.style.setProperty("--leaflet-height-unitless", window.innerHeight)
              el.style.setProperty("--leaflet-width-unitless", window.innerWidth)
            }
            listener()
            window.addEventListener("resize", listener)
            `,
          }}
        />
        <Analytics />
        <ServiceWorker />
        <InitialPageLoad>
          <PopUpProvider>
            <IdentityProviderServer>
              <RequestHeadersProvider
                country={ipLocation}
                language={acceptLanguage}
                timezone={ipTimezone}
              >
                <ViewportSizeLayout>{children}</ViewportSizeLayout>
                <RouteUIStateManager />
              </RequestHeadersProvider>
            </IdentityProviderServer>
          </PopUpProvider>
        </InitialPageLoad>
      </body>
    </html>
  );
}
