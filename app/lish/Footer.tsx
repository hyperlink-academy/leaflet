"use client";
import { Menu, MenuItem } from "components/Layout";
import { useEffect, useState } from "react";
import { SubscribeButton } from "./Subscribe";
import Link from "next/link";
import { ButtonPrimary } from "components/Buttons";
import { usePublicationRelationship } from "./[handle]/[publication]/usePublicationRelationship";
import { usePublicationContext } from "components/Providers/PublicationContext";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";

export const Footer = (props: { pageType: "post" | "pub" }) => {
  return (
    <div className="footer w-full bg-bg-page  border-0 border-t border-border flex flex-col ">
      <ScrollProgress />
      <div className="footerContent w-full min-h-12 h-fit max-w-prose mx-auto px-4 py-2 flex justify-between items-center gap-6">
        {/* <MoreOptionsMenu /> */}
        <FooterSubscribeButton pageType={props.pageType} />
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
    <div className="footerScrollProgress w-full h-1 bg-bg-page">
      <div
        className={`h-full bg-accent-contrast`}
        style={{ width: `${scrollPercent}%` }}
      ></div>
    </div>
  );
};

const FooterSubscribeButton = (props: { pageType: "post" | "pub" }) => {
  let [pubHeaderIsVisible, setPubHeaderIsVisible] = useState(
    props.pageType === "pub" ? true : false,
  );
  let rel = usePublicationRelationship();
  let { publication } = usePublicationContext();

  useEffect(() => {
    let pubHeader = document.getElementById("pub-header");
    if (!pubHeader) return;
    let observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setPubHeaderIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0 },
    );
    observer.observe(pubHeader);
    return () => observer.unobserve(pubHeader);
  }, []);

  if (rel?.isSubscribed || pubHeaderIsVisible || !publication) return;
  if (rel?.isAuthor)
    return (
      <div className="flex gap-2">
        <ButtonPrimary>Write a Draft</ButtonPrimary>
        {/* <ShareButton /> */}
      </div>
    );
  return <SubscribeButton compact publication={publication?.uri} />;
};
const MoreOptionsMenu = () => {
  return (
    <Menu trigger={<MoreOptionsTiny className="footerMoreOptions rotate-90" />}>
      <MenuItem onSelect={() => {}}>Log in</MenuItem>
      <hr className="border-border-light" />

      <small className="text-tertiary px-3 leading-none pt-2 font-bold">
        Back to...
      </small>
      <MenuItem onSelect={() => {}}>
        <Link href="./publication">Leaflet Explorers</Link>
      </MenuItem>
      <MenuItem onSelect={() => {}}>
        <Link href="./">Your Feed</Link>
      </MenuItem>
    </Menu>
  );
};
