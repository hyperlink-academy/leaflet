import type { Metadata } from "next";
import { AboutPage } from "./about/AboutPage";

export const metadata: Metadata = {
  title: "Leaflet — social publishing on the Atmosphere",
  description:
    "A simple and powerful platform for social publishing — blogs, newsletters, and more!",
};

export const revalidate = 3600;

export default function RootPage() {
  return <AboutPage />;
}
