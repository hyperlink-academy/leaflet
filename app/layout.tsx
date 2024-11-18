import { ViewportSizeLayout } from "components/ViewportSizeLayout";
import { InitialPageLoad } from "../components/InitialPageLoadProvider";
import { ServiceWorker } from "../components/ServiceWorker";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import localFont from "next/font/local";
import { PopUpProvider } from "components/Toast";

export const metadata = {
  title: "Leaflet",
  description: "tiny interconnected social documents",
  metadataBase: `https://leaflet.pub`,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${quattro.variable}`}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            let listener = () => {
              console.log("firing listener", window.innerHeight, window.innerWidth)
              let el = document.querySelector(":root");
              el.style.setProperty("--leaflet-height-unitless", window.innerHeight)
              el.style.setProperty("--leaflet-width-unitless", window.innerWidth)
              el.style.setProperty("--test", "THIS IS A TEST")
            }
            if (document.readyState === 'complete') {
              listener();
            } else {
              document.addEventListener('DOMContentLoaded', listener);
            }
            window.addEventListener("resize", listener)
            const styleObserver = new MutationObserver((mutations) => {
              const currentValue = mutations[0].target.style.getPropertyValue('--leaflet-width-unitless');
              console.log(currentValue)
              console.log(mutations[0].target.style.getPropertyValue('--test'));
            });

            styleObserver.observe(document.documentElement, {
              attributes: true,
              attributeFilter: ['style'],
            });
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
