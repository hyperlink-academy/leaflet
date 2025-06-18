"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { useState, useEffect } from "react";
import { useIsMobile } from "src/hooks/isMobile";
import { Media } from "components/Media";
import { create } from "zustand";

export let useInteractionState = create(() => ({ drawerOpen: false }));

export const Interactions = () => {
  let { drawerOpen } = useInteractionState();

  return (
    <div className="flex gap-2 text-sm text-tertiary ">
      {/* <div className="flex gap-1 items-center">
        <CommentTiny /> 5
      </div> */}
      <button
        className="flex gap-1 items-center"
        onClick={() =>
          useInteractionState.setState({ drawerOpen: !drawerOpen })
        }
      >
        <QuoteTiny /> 5
      </button>
    </div>
  );
};

export const InteractionDrawer = () => {
  let { drawerOpen: open } = useInteractionState();

  if (!open) return null;
  return (
    <>
      <Media
        mobile={false}
        className="sticky top-0 shrink w-96 py-6 h-full max-w-full flex"
      >
        <div className="opaque-container h-full w-full px-4 pt-3 pb-6 overflow-scroll ">
          <QuoteDrawer />
        </div>
      </Media>
      <Media
        mobile
        className="drawerMobileWrapper fixed bottom-0 left-0 right-0 h-[80vh] border-t border-border px-3 pt-2 pb-6  bg-bg-page overflow-auto"
      >
        <QuoteDrawer />
      </Media>
    </>
  );
};

const QuoteDrawer = () => {
  let isMobile = useIsMobile();

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
    <div className="flex flex-col gap-2">
      <div className="w-full flex justify-between text-secondary font-bold">
        Quotes
        <button
          className="text-tertiary"
          onClick={() => useInteractionState.setState({ drawerOpen: false })}
        >
          <CloseTiny />
        </button>
      </div>
      {quotes.length === 0 ? (
        <div className="opaque-container flex flex-col gap-0.5 p-[6px] text-tertiary italic text-sm text-center">
          <div className="font-bold">no quotes yet!</div>
          <div>highlight any part of this post to quote it</div>
        </div>
      ) : (
        <div className="quotes flex flex-col gap-12">
          {quotes.map((q) => {
            return (
              <div className="quoteSection flex flex-col">
                <button
                  className="quoteSectionQuote text-secondary text-sm italic text-left pb-1 x "
                  onClick={(e) => {
                    let scrollMargin = isMobile
                      ? 16
                      : e.currentTarget.getBoundingClientRect().top;
                    let scrollContainer =
                      window.document.getElementById("post-page");
                    let quoteScrollTop =
                      (scrollContainer &&
                        q.getBoundingClientRect().top +
                          scrollContainer.scrollTop) ||
                      0;
                    console.log("quote : " + q.getBoundingClientRect().top);
                    console.log("parent : " + scrollContainer?.scrollTop);

                    scrollContainer?.scrollTo({
                      top: quoteScrollTop - scrollMargin,
                      behavior: "smooth",
                    });
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
                <div className="flex flex-col gap-2">
                  <QuoteSectionBskyItem content="Oh, heck yeah I love this" />
                  <QuoteSectionBskyItem content="What if I wrote something that's pretty long. Like if I had a really deep thought that I want people to really engage with me seriously about. There's something really special about having a thought. May the thoughts just keep on rolling." />

                  <QuoteSectionBskyItem content="hello :)" />
                </div>
                <div className="text-xs text-tertiary italic font-bold pt-2 pb-1">
                  Mentioned in
                </div>
                <div className="flex flex-col gap-2">
                  <QuoteSectionLeafletItem content="I found this pretty interesting and so I'll go ahead and just type some stuff about it... I think that'll be good enough don't you think? A little above and a little below" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
      <div className="items-center flex gap-1">
        <div className="w-3 h-3 bg-test rounded-full" />
        <div className="text-accent-contrast text-xs">celine's pub</div>
      </div>
    </div>
  );
};
