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
  src: "../public/fonts/iAWriterQuattroV.ttf",
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
        <InitialPageLoad>{children}</InitialPageLoad>
      </body>
    </html>
  );
}
