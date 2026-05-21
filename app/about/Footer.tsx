import { SpeedyLink } from "components/SpeedyLink";

export const Footer = () => {
  return (
    <div className="aboutFooter flex w-full mt-24 text-center">
      <div className="w-screen  bg-[#57822B] -mx-4 sm:-mx-12 text-white pt-3 pb-8 ">
        <div className="w-fit mx-auto flex gap-16">
          <div className="flex flex-col gap-1">
            <strong>Explore</strong>
            <SpeedyLink href="/reader" className="text-white">
              Reader
            </SpeedyLink>
          </div>
          <div className="flex flex-col gap-1">
            <strong>Contact</strong>
            <a className="text-white" href="mailto:contact@leaflet.pub">
              Email
            </a>
            <a
              href="https://bsky.app/profile/leaflet.pub"
              target="_blank"
              rel="noreferrer"
              className="text-white"
            >
              Bluesky
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <strong>Other</strong>
            <SpeedyLink href="/legal" target="_blank" className="text-white">
              Terms
            </SpeedyLink>
          </div>
        </div>
      </div>
    </div>
  );
};
