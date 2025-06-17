"use client";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";
import { CloseTiny } from "components/Icons/CloseTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { CopyTiny } from "components/Icons/CopyTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { useSmoker } from "components/Toast";
import { useState, useEffect } from "react";
import { QuoteOptionButtons } from "./QuoteHandler";

export const Interactions = () => {
  return (
    <div className="flex gap-2 text-sm text-tertiary pb-2">
      <div className="flex gap-1 items-center">
        <CommentTiny /> 5
      </div>
      <Separator classname="h-4" />
      <div className="flex gap-1 items-center">
        <QuoteTiny /> 5
      </div>
    </div>
  );
};

export const InteractionDrawerDesktop = (props: {
  // drawerOpen: boolean;
  // setDrawerOpen: (d: boolean) => void;
}) => {
  // if (!props.drawerOpen) return;

  return (
    <div className=" opaque-container h-full w-full px-4 py-3 flex flex-col gap-4 relative overflow-scroll ">
      <QuoteDrawer />
    </div>
  );
};

export const InteractionDrawerMobile = () => {
  return (
    <div className="drawerMobileWrapper absolute top-0 left-0 right-0 h-[80vh]">
      <div className="drawerMobileContent border-b border-border h-full px-3 py-2 flex flex-col gap-4 relative bg-[#FDFCFA] overflow-scroll">
        <QuoteDrawer />
      </div>
    </div>
  );
};

const QuoteDrawer = () => {
  let smoker = useSmoker();
  let [quotes, setQuotes] = useState<Element[]>([]);
  useEffect(() => {
    function updateQuotes() {
      setQuotes(
        Array.from(window.document.getElementsByClassName("highlight")),
      );
    }
    updateQuotes();
    const observer = new MutationObserver(() => {
      updateQuotes();
    });

    observer.observe(document.body, {
      childList: true, // Watch for added/removed child nodes
      subtree: true, // Watch the entire subtree
    });

    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <>
      <div className="w-full flex justify-between text-secondary font-bold">
        Quotes
        <button className="text-tertiary">
          <CloseTiny />
        </button>
      </div>
      {quotes.length === 0 ? (
        <div className="opaque-container flex flex-col gap-0.5 p-[6px] text-tertiary italic text-sm text-center">
          <div className="font-bold">no quotes yet!</div>
          <div>highlight any part of this post to quote it</div>
        </div>
      ) : (
        <div className="quotes flex flex-col gap-6">
          {quotes.map((q) => {
            return (
              <div className="quoteSection flex flex-col">
                <button
                  className="quoteSectionQuote text-secondary text-sm italic text-left pb-1 x "
                  onClick={() => {
                    q.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }}
                >
                  <span
                    className="rounded-md"
                    style={{
                      backgroundColor: "rgba(var(--accent-contrast), .15)",
                    }}
                  >
                    "{q.textContent}"
                  </span>
                </button>

                <div className="text-xs text-tertiary italic font-bold pt-2 pb-1">
                  On Bluesky
                </div>
                <QuoteSectionBskyItem content="Oh, heck yeah I love this" />
                <div className=" border-l border-border-light h-2 ml-3" />
                <QuoteSectionBskyItem content="What if I wrote something that's pretty long. Like if I had a really deep thought that I want people to really engage with me seriously about. There's something really special about having a thought. May the thoughts just keep on rolling." />
                <div className=" border-l border-border-light h-2 ml-3" />

                <QuoteSectionBskyItem content="hello :)" />

                <div className="text-xs text-tertiary italic font-bold pt-2 pb-1">
                  Mentioned in
                </div>
                <QuoteSectionLeafletItem content="I found this pretty interesting and so I'll go ahead and just type some stuff about it... I think that'll be good enough don't you think? A little above and a little below" />

                <div className="text-sm text-secondary flex justify-end gap-2 pt-2">
                  <QuoteOptionButtons />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

const QuoteSectionBskyItem = (props: { content: string }) => {
  return (
    <div className="quoteSectionBskyItem opaque-container py-1 px-2 text-sm flex gap-[6px]">
      <div className="w-4 h-4 bg-test rounded-full shrink-0 mt-1" />
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <div className="font-bold">celine</div>
          <div className="text-tertiary">@cozylitte.house</div>
        </div>
        <div className="text-secondary">{props.content}</div>
      </div>
    </div>
  );
};

const QuoteSectionLeafletItem = (props: { content: string }) => {
  return (
    <div className="quoteSectionLeafletItem text-sm text-secondary opaque-container py-1 px-2">
      <div className="font-bold">This is a Post Title</div>

      {props.content}
      <hr className="border-border-light mt-2 mb-0.5" />
      <div className="text-accent-contrast text-xs">celine's pub</div>
    </div>
  );
};
