import type { Metadata } from "next";
import { AboutPage } from "./about/AboutPage";

export const metadata: Metadata = {
  title: "Leaflet — social publishing on the Atmosphere",
  description:
    "A simple and powerful platform for social publishing — blogs, newsletters, and more!",
};

export default function RootPage() {
  return <AboutPage />;
}
