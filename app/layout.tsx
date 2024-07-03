import { ViewportSizeLayout } from "components/ViewportSizeLayout";
import { InitialPageLoad } from "../components/InitialPageLoadProvider";
import { ServiceWorker } from "../components/ServiceWorker";
import "./globals.css";
import localFont from "next/font/local";

export const metadata = {
  title: "Minilink",
  description: "tiny interconnected social documents",
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
        <ServiceWorker />
        <InitialPageLoad>
          <ViewportSizeLayout>{children}</ViewportSizeLayout>
        </InitialPageLoad>
      </body>
    </html>
  );
}
