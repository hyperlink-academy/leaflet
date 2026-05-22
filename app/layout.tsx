import { ViewportSizeLayout } from "components/ViewportSizeLayout";
import { InitialPageLoad } from "../components/InitialPageLoadProvider";
import { ServiceWorker } from "../components/ServiceWorker";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import localFont from "next/font/local";
import { PopUpProvider } from "components/Toast";

export const metadata = {
  title: "Leaflet",
  description: "Read and publish on the Atmosphere",
  metadataBase: new URL(`https://leaflet.pub`),
  openGraph: {
    images: ["/open-graph.png"],
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <ViewportSizeLayout>{children}</ViewportSizeLayout>
          </PopUpProvider>
        </InitialPageLoad>
      </body>
    </html>
  );
}
