"use client";
import { onScroll } from "@react-spring/shared";
import { MoreOptionsTiny, ShareSmall } from "components/Icons";
import { Menu, MenuItem, Separator } from "components/Layout";
import { useEffect, useState } from "react";

export const Footer = () => {
  return (
    <div className="w-full bg-bg-page  border-0 border-t border-border flex flex-col ">
      <ScrollProgress />
      <div className="px-4 py-2 flex justify-between items-center">
        <MoreOptions />
        <div className="flex gap-2 w-fit items-center">
          <button className="font-bold text-accent-contrast">Subscribe</button>
          <Separator classname="h-6" />
          <button className="text-accent-contrast">
            <ShareSmall />
          </button>
        </div>
      </div>
    </div>
  );
};

const ScrollProgress = () => {
  let [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    let post = document.getElementById("post");

    let onScroll = () => {
      if (!post) return;
      let currentScroll = post?.scrollTop;
      let totalScroll = post?.scrollHeight - post?.clientHeight;
      setScrollPercent((currentScroll / totalScroll) * 100);
    };
    post?.addEventListener("scroll", onScroll);
    return () => post?.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="w-full h-1 bg-bg-page">
      <div
        className={`h-full bg-accent-contrast`}
        style={{ width: `${scrollPercent}%` }}
      ></div>
    </div>
  );
};

const MoreOptions = () => {
  return (
    <Menu trigger={<MoreOptionsTiny />}>
      <MenuItem onSelect={() => {}}>Log in</MenuItem>
      <hr className="border-border-light" />

      <small className="text-tertiary px-3 leading-none pt-2 font-bold">
        Back to...
      </small>
      <MenuItem onSelect={() => {}}>Leaflet Explorers</MenuItem>
      <MenuItem onSelect={() => {}}>Your Feed</MenuItem>
    </Menu>
  );
};
