"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useState, useEffect } from "react";
import { useIsMobile } from "src/hooks/isMobile";
import { useInteractionState } from "./Interactions";
import Link from "next/link";

export const Quotes = () => {
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
              <div className="quoteSection flex flex-col gap-2">
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
                  <span className="line-clamp-3">
                    <span
                      className="rounded-md px-0.5"
                      style={{
                        backgroundColor: "rgba(var(--accent-contrast), .15)",
                      }}
                    >
                      {q.textContent}
                    </span>
                  </span>
                </button>

                <div className="flex flex-col gap-2">
                  {QuoteSectionBskyItems.map((i) => {
                    return (
                      <QuoteSectionBskyItem
                        content={i.content}
                        user={i.user}
                        handle={i.handle}
                      />
                    );
                  })}
                </div>
                {QuoteSectionBskyItems.length > 0 &&
                  QuoteSectionLeafletItems.length > 0 && (
                    <hr className="border-border-light my-1" />
                  )}
                <div className="flex flex-col gap-2">
                  {QuoteSectionLeafletItems.map((i) => {
                    return (
                      <QuoteSectionLeafletItem
                        pub={i.pub}
                        title={i.title}
                        description={i.description}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const QuoteSectionBskyItem = (props: {
  content: string;
  user: string;
  handle: string;
}) => {
  return (
    <Link
      href="/"
      className="quoteSectionBskyItem opaque-container py-1 px-2 text-sm flex gap-[6px]"
    >
      <div className="w-4 h-4 bg-test rounded-full shrink-0 mt-1" />
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <div className="font-bold">{props.user}</div>
          <div className="text-tertiary">{props.handle}</div>
        </div>
        <div className="text-secondary">{props.content}</div>
      </div>
    </Link>
  );
};

const QuoteSectionLeafletItem = (props: {
  title: string;
  description: string;
  pub: string;
}) => {
  return (
    <Link
      href="/"
      className="quoteSectionLeafletItem text-sm text-secondary opaque-container py-1 px-2"
    >
      <div className="font-bold">{props.title}</div>
      {props.description}
      <hr className="border-border-light mt-2 mb-0.5" />
      <div className="items-center flex gap-1">
        <div className="w-3 h-3 bg-test rounded-full" />
        <div className="text-accent-contrast text-xs">{props.pub}</div>
      </div>
    </Link>
  );
};

let QuoteSectionBskyItems = [
  { content: "hello :3", user: "celine", handle: "@cozylitte.house" },
  {
    content:
      "What if I wrote something that's pretty long. Like if I had a really deep thought that I want people to really engage with me seriously about. There's something really special about having a thought. May the thoughts just keep on rolling.",
    user: "jared",
    handle: "@awarm.space",
  },
  {
    content: "Oh, heck yeah I love this",
    user: "Brendan",
    handle: "@schlage.town",
  },
];
let QuoteSectionLeafletItems = [
  {
    title: "This is a Blog Post",
    description:
      "This is a pub where I pretend that there are things I want to write!",
    pub: "celine's pub",
  },
];
