"use client";
import Link from "next/link";
import { useState } from "react";

export function SpeedyLink(props: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  target?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  let [prefetch, setPrefetch] = useState(false);
  return (
    <Link
      onMouseEnter={() => setPrefetch(true)}
      onPointerDown={() => setPrefetch(true)}
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
