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

export function AboutPage() {
  return (
    <main
      className={`${ibmPlexSerif.variable} aboutPage w-full bg-[#FDFCFA] flex flex-col justify-center sm:px-12 px-4 mx-auto overflow-x-hidden`}
    >
      <div className="spacer h-[96px] sm:h-[160px]" />
      <div className="aboutCover relative  max-w-full mx-auto w-[800px] flex flex-col gap-3 sm:gap-4">
        <h1
          className={` text-[#57822B] leading-none absolute -top-16 left-4 sm:-top-28 md:-left-16 sm:left-6 z-10`}
          style={{
            textShadow: "3px 7px 0 #D9EA72",
            WebkitTextStroke: "0.5px #D9EA72",
          }}
        >
          Leaflet
        </h1>

        <img
          src="/about/hero.webp"
          alt=""
          className="w-full h-full object-cover aspect-3/2"
        />
        <LandingCTA />
      </div>

      <p className=" pt-6 text-tertiary text-center leading-snug mx-auto text-lg sm:text-xl!">
        A simple and powerful platform for social publishing <br />— blogs,
        newsletters, and more!
      </p>
      {/*<Demo />*/}
      <Features />
      <Examples />
      <Pricing />
      <LandingCTABottom />
      <Footer />
    </main>
  );
}
