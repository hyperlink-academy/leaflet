"use client";
import { Popover } from "components/Popover";
import { ButtonPrimary } from "components/Buttons";

const apps = [
  { name: "Leaflet", logo: "https://leaflet.pub/logos/leaflet.svg" },
  { name: "Bluesky", logo: "https://leaflet.pub/logos/bluesky.svg" },
  { name: "Blacksky", logo: "https://leaflet.pub/logos/blacksky.svg" },
  { name: "Eurosky", logo: "https://leaflet.pub/logos/eurosky.svg" },
  { name: "Tangled", logo: "https://leaflet.pub/logos/tangled.svg" },
  { name: "Semble", logo: "https://leaflet.pub/logos/semble.svg" },
  { name: "Surf", logo: "https://leaflet.pub/logos/surf.svg" },
  { name: "Spark", logo: "https://leaflet.pub/logos/spark.svg" },
  { name: "Pckt", logo: "https://leaflet.pub/logos/pckt.svg" },
  { name: "pdsls", logo: "https://leaflet.pub/logos/pdsls.svg" },
  { name: "plyr.fm", logo: "https://leaflet.pub/logos/plyr.fm.svg" },
  { name: "Popfeed", logo: "https://leaflet.pub/logos/popfeed.svg" },
  { name: "Roomy", logo: "https://leaflet.pub/logos/roomy.svg" },
  { name: "Sill", logo: "https://leaflet.pub/logos/sill.svg" },
  { name: "Offprint", logo: "https://leaflet.pub/logos/offprint.svg" },
  { name: "Margin", logo: "https://leaflet.pub/logos/margin.svg" },
  { name: "Anisota", logo: "https://leaflet.pub/logos/anisota.svg" },
  { name: "Blento", logo: "https://leaflet.pub/logos/blento.svg" },
  { name: "Cartridge", logo: "https://leaflet.pub/logos/cartridge.svg" },
  { name: "Graze", logo: "https://leaflet.pub/logos/graze.svg" },
];

export const AtmosphericHandleInfo = (props: { trigger?: React.ReactNode }) => {
  return (
    <Popover
      className="z-100! w-[min(24rem,var(--radix-popover-content-available-width))] flex flex-col"
      trigger={
        props.trigger ? (
          props.trigger
        ) : (
          <div className="text-accent-contrast text-sm mx-auto">
            What's the Atmosphere?
          </div>
        )
      }
    >
      <div className="font-bold text-secondary pb-1 ">
        The Atmosphere is a growing ecosystem of social apps, like Leaflet and
        Bluesky.
        <br />
      </div>
      <div className="pb-3 font-bold text-secondary">
        One account gets you into <em>all</em> of them.
      </div>

      <div className=" text-sm text-tertiary uppercase">
        Apps on the Atmosphere!
      </div>
      <div className="opaque-container pt-3 pb-2 overflow-hidden">
        <div className="logo-scroll-track flex w-max">
          {[...apps, ...apps].map((app, i) => (
            <AtApp key={i} logo={app.logo} name={app.name} />
          ))}
        </div>
      </div>

      <ButtonPrimary fullWidth className="mt-3 mx-auto mb-3">
        Sign up via Bluesky!
      </ButtonPrimary>
    </Popover>
  );
};

const AtApp = (props: { logo: string; name: string }) => {
  return (
    <div className="w-20 flex-shrink-0 flex flex-col gap-2 justify-center text-tertiary font-bold text-sm text-center">
      <img src={props.logo} alt={props.name} className="w-12 h-12 mx-auto" />
      {props.name}
    </div>
  );
};
