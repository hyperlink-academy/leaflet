import { GoToArrow } from "components/Icons/GoToArrow";
import { ExternalLinkBlock } from "./ExternalLinkBlock";
import { Separator } from "components/Layout";

export const QuoteEmbedBlockLine = () => {
  return (
    <div className="quoteEmbedBlock flex  sm:mx-4 mx-3 my-3 sm:my-4 text-secondary text-sm italic">
      <div className="w-2 h-full bg-border" />
      <div className="flex flex-col pl-4">
        <div className="quoteEmbedContent ">
          Hello, this is a long quote that I am writing to you! I am so excited
          that you decided to quote my stuff. I would love to take a moments and
          just say whatever the heck i feel like. Unforunately for you, it is a
          rather boring todo list. I need to add an author and pub name, i need
          to add a back link, and i need to link about text formatting, if we
          want to handle it.
        </div>
        <div className="quoteEmbedFooter flex  gap-2 pt-2 ">
          <div className="flex flex-col leading-tight grow">
            <div className="font-bold ">This was made to be quoted</div>
            <div className="text-tertiary text-xs">celine</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuoteEmbedBlock = () => {
  return (
    <div className="quoteEmbedBlock transparent-container sm:mx-4 mx-3 my-3 sm:my-4 text-secondary text-sm">
      <div className="quoteEmbedContent p-3">
        Hello, this is a long quote that I am writing to you! I am so excited
        that you decided to quote my stuff. I would love to take a moments and
        just say whatever the heck i feel like. Unforunately for you, it is a
        rather boring todo list. I need to add an author and pub name, i need to
        add a back link, and i need to link about text formatting, if we want to
        handle it.
      </div>
      <hr className="border-border-light" />
      <a
        className="quoteEmbedFooter flex max-w-full gap-2 px-3 py-2  hover:!no-underline text-secondary"
        href="#"
      >
        <div className="flex flex-col w-[calc(100%-28px)] grow">
          <div className="font-bold w-full truncate">
            This was made to be quoted and if it's very long, to truncate
          </div>
          <div className="flex gap-[6px] text-tertiary text-xs items-center">
            <div className="underline">lab.leaflet.pub</div>
            <Separator classname="h-2" />
            <div>celine</div>
          </div>
        </div>
        <div className=" shrink-0 pt-[1px] bg-test w-5 h-5 rounded-full"></div>
      </a>
    </div>
  );
};
