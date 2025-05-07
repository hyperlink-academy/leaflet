import { ViewportSizeLayout } from "components/ViewportSizeLayout";
import { InitialPageLoad } from "../components/InitialPageLoadProvider";
import { ServiceWorker } from "../components/ServiceWorker";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import localFont from "next/font/local";
import { PopUpProvider } from "components/Toast";
import { IdentityProviderServer } from "components/IdentityProviderServer";
import { headers } from "next/headers";
import { IPLocationProvider } from "components/Providers/IPLocationProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";

export const metadata = {
  title: "Leaflet",
  description: "tiny interconnected social documents",
  metadataBase: new URL(`https://leaflet.pub`),
  icons: [
    {
      type: "apple-touch-icon",
      sizes: "180x180",
      url: "/apple-touch-icon.png",
    },
  ],
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
      path: "../public/fonts/iAWriterQuattroV.ttf",
      style: "normal",
    },
    {
      path: "../public/fonts/iAWriterQuattroV-Italic.ttf",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-quattro",
});

export default async function RootLayout(
  {
    children,
  }: {
    children: React.ReactNode;
  }
) {
  let ipLocation = (await headers()).get("X-Vercel-IP-Country");
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
              <IPLocationProvider country={ipLocation}>
                <ViewportSizeLayout>{children}</ViewportSizeLayout>
                <RouteUIStateManager />
              </IPLocationProvider>
            </IdentityProviderServer>
          </PopUpProvider>
        </InitialPageLoad>
      </body>
    </html>
  );
}
