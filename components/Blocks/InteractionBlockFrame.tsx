"use client";
import { useEffect, useState } from "react";
import { scrollIntoView } from "src/utils/scrollIntoView";

// A published questions or reply block's box, under the anchor emails and
// notifications link to. When the page is opened at that anchor it scrolls
// into view, flashes an outline, and tells its children it was targeted.
export function InteractionBlockFrame(props: {
  anchor: string;
  className: string;
  children: (targeted: boolean) => React.ReactNode;
}) {
  let { anchor } = props;
  let [targeted, setTargeted] = useState(false);
  let [flash, setFlash] = useState(false);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let check = () => {
      if (window.location.hash !== `#${anchor}`) return;
      setTargeted(true);
      setFlash(true);
      scrollIntoView(anchor, 0.5);
      clearTimeout(timeout);
      timeout = setTimeout(() => setFlash(false), 2500);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => {
      window.removeEventListener("hashchange", check);
      clearTimeout(timeout);
    };
  }, [anchor]);
  return (
    <div
      id={anchor}
      className={`${props.className} transition-[outline-color] duration-700 outline-2 outline-offset-2 ${flash ? "outline-accent-contrast" : "outline-transparent"}`}
    >
      {props.children(targeted)}
    </div>
  );
}
