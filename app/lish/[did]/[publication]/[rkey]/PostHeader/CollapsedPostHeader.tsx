"use client";

import { Media } from "components/Media";
import {
  Interactions,
  useInteractionState,
} from "../Interactions/Interactions";
import { useState, useEffect } from "react";

export const CollapsedPostHeader = (props: { title: string }) => {
  let [headerVisible, setHeaderVisible] = useState(false);
  let { drawerOpen: open } = useInteractionState();

  useEffect(() => {
    let post = window.document.getElementById("post-page");

    function handleScroll() {
      let postHeader = window.document
        .getElementById("post-header")
        ?.getBoundingClientRect();
      if (postHeader && postHeader.bottom <= 0) {
        setHeaderVisible(true);
      } else {
        setHeaderVisible(false);
      }
    }
    post?.addEventListener("scroll", handleScroll);
    return () => {
      post?.removeEventListener("scroll", handleScroll);
    };
  }, []);
  if (!headerVisible) return;
  if (open) return;
  return (
    <Media
      mobile
      className="fixed top-0 left-0 right-0 w-full bg-[#FDFCFA] border-b border-border-light"
    >
      <div className="flex gap-2 items-center justify-between px-3 pt-2 pb-0.5 ">
        <div className="text-tertiary font-bold text-sm truncate pr-1">
          {props.title}
        </div>
        <Interactions compact />
        <div className="w-4 h-4 rounded-full bg-test shrink-0" />
      </div>
    </Media>
  );
};
