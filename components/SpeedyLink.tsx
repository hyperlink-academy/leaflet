"use client";
import Link from "next/link";
import { useState } from "react";

// Links default to prefetching only once pointed at, which keeps long lists of
// posts from firing a request per row (and does nothing on touch). Pass `eager`
// for the small fixed set of shell/nav links, where prefetching on mount is a
// handful of requests in exchange for an instant navigation.
export function SpeedyLink(props: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  target?: string;
  eager?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  let [pointedAt, setPointedAt] = useState(false);
  let prefetch = props.eager || pointedAt;
  return (
    <Link
      onMouseEnter={() => setPointedAt(true)}
      onPointerDown={() => setPointedAt(true)}
      onClick={props.onClick}
      style={props.style}
      prefetch={prefetch}
      href={props.href}
      target={props.target}
      className={props.className}
    >
      {props.children}
    </Link>
  );
}
