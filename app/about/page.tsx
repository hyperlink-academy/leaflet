import { AboutPage } from "./AboutPage";

export const metadata = {
  title: "Leaflet — social publishing on the Atmosphere",
  description:
    "A simple and powerful platform for social publishing — blogs, newsletters, and more!",
};

export const revalidate = 3600;

export default function About() {
  return <AboutPage />;
}
