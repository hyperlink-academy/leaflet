import "./about.css";
import { IBM_Plex_Serif } from "next/font/google";
import { LandingCTA, LandingCTABottom } from "./LandingCTA";
import { Demo } from "./Demo";
import { Features } from "./Features";
import { Examples } from "./Examples";
import { Pricing } from "./Pricing";
import { Footer } from "./Footer";

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-ibm-plex-serif",
});

export const metadata = {
  title: "Leaflet — social publishing on the Atmosphere",
  description:
    "A simple and powerful platform for social publishing — blogs, newsletters, and more!",
};

export default async function About() {
  return (
    <main
      className={`${ibmPlexSerif.variable} aboutPage w-full bg-[#FDFCFA] flex flex-col justify-center px-12 mx-auto`}
    >
      <div className="spacer h-[160px]" />
      <div className="aboutCover relative aspect-3/2 max-w-full mx-auto w-[800px] flex flex-col gap-4">
        <h1
          className={` text-[#57822B] text-[180px] leading-none absolute sm:-top-28 sm:-left-16 z-10`}
          style={{
            textShadow: "3px 7px 0 #D9EA72",
            WebkitTextStroke: "0.5px #D9EA72",
          }}
        >
          Leaflet
        </h1>

        <img
          src="/about/hero.png"
          alt=""
          className="w-full h-full object-cover"
        />

        <LandingCTA />
      </div>

      <p className=" pt-6 text-tertiary text-center text-lg sm:text-xl leading-snug mx-auto">
        A simple and powerful platform for social publishing <br />— blogs,
        newsletters, and more!
      </p>
      <Demo />
      <Features />
      <Examples />
      <Pricing />
      <LandingCTABottom />
      <Footer />
    </main>
  );
}
