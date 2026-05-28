import "./about.css";
import { IBM_Plex_Serif } from "next/font/google";
import { LandingCTA, LandingCTABottom } from "./LandingCTA";
import { InteractiveAppDemo } from "./InteractiveAppDemo";
import { InteractiveAppDemoMobile } from "./InteractiveAppDemoMobile";
import { Media } from "components/Media";
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
      className={`${ibmPlexSerif.variable} aboutPage w-full bg-[#FDFCFA] flex flex-col justify-center sm:px-12 px-4 mx-auto overflow-x-clip overflow-y-auto`}
    >
      <div className="spacer h-[48px] sm:h-[96px]" />
      <div className="aboutCover relative  max-w-full mx-auto w-[960px] flex flex-col gap-3 sm:gap-4">
        <h1 className={`hidden`}>Leaflet</h1>
        <img
          src="/about/HeroText.webp"
          alt=""
          className="absolute left-1/2 -translate-x-1/2 top-0 sm:top-[3%] z-10 w-[90%] sm:w-[75%]"
        />

        <img
          src="/about/hero.webp"
          alt=""
          className="w-full h-full object-cover aspect-3/2"
        />
        <LandingCTA />
      </div>

      <p className=" pt-6 sm:pt-12 text-tertiary text-center leading-snug mx-auto text-lg sm:text-xl!">
        Delightful connection to your community <br />
        with a blog, newsletter, or secret third thing.
      </p>
      <div className="mt-12 sm:mt-24 py-6 sm:p-12 bg-[#F1EDE5] rounded-[12px] sm:rounded-[24px]">
        <div className="text-center mx-auto pb-3 sm:pb-6">
          <h3>Powerful Publishing Tools</h3>
          <p className="text-secondary">
            Easily write and manage posts, and track subscriptions
          </p>
        </div>
        <Media mobile={false}>
          <InteractiveAppDemo />
        </Media>
        <Media mobile={true}>
          <InteractiveAppDemoMobile />
        </Media>
      </div>
      <Features />
      <Examples />
      <Pricing />
      <LandingCTABottom />
      <Footer />
    </main>
  );
}
