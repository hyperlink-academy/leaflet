"use client";
import { BlobRef } from "@atproto/lexicon";
import { useState } from "react";
import { useIsMobile } from "src/hooks/isMobile";
import { theme } from "tailwind.config";
import { usePublicationData } from "./PublicationSWRProvider";
import { PubLeafletPublication } from "lexicons/api";

type Tabs = { [tabName: string]: React.ReactNode };
export function PublicationDashboard<T extends Tabs>(props: {
  name: string;
  tabs: T;
  defaultTab: keyof T;
  icon: BlobRef | null;
  did: string;
}) {
  let { data: pub } = usePublicationData();
  let showPageBackground = !!(pub?.record as PubLeafletPublication.Record)
    ?.theme?.showPageBackground;
  let [tab, setTab] = useState(props.defaultTab);
  let content = props.tabs[tab];

  return (
    <>
      <div className="pubDashHeader flex flex-row gap-2 w-full justify-between border-b border-border text-secondary items-center ">
        <div className="max-w-full w-[1000px] h-full ">
          <div
            className={`flex gap-2 h-fit  py-0.5 pl-1 pr-2 w-fit  rounded-md ${showPageBackground ? "bg-[rgba(var(--bg-page),0.8)]" : ""}`}
          >
            {props.icon && (
              <div
                className="pubDashLogo shrink-0 w-6 h-6 rounded-full  border-2 border-bg-page "
                style={{
                  backgroundImage: `url(/api/atproto_images?did=${props.did}&cid=${(props.icon.ref as unknown as { $link: string })["$link"]})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />
            )}
            <div className="pubDashName font-bold grow text-tertiary max-w-full truncate  sm:block hidden">
              {props.name}
            </div>
          </div>
        </div>
        <div className="pubDashTabs flex flex-row gap-1">
          {Object.keys(props.tabs).map((t) => (
            <Tab
              key={t}
              name={t}
              selected={t === tab}
              onSelect={() => setTab(t)}
              showPageBackground={showPageBackground}
            />
          ))}
        </div>
      </div>
      <div
        className={`pubDashContent py-4 px-3 sm:px-4 h-full overflow-auto ${showPageBackground ? "rounded-b-md border border-border border-t-0 bg-[rgba(var(--bg-page),var(--bg-page-alpha))]" : ""}`}
      >
        {content}
      </div>
    </>
  );
}

function Tab(props: {
  name: string;
  selected: boolean;
  showPageBackground: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`pubTabs border  border-b-0 px-2 pt-1 pb-0.5 rounded-t-md border-border hover:cursor-pointer ${props.selected ? "text-accent-contrast font-bold -mb-[1px]" : ""} ${props.showPageBackground ? "bg-[rgba(var(--bg-page),var(--bg-page-alpha))]" : ""}`}
      onClick={() => props.onSelect()}
    >
      {props.name}
    </div>
  );
}
