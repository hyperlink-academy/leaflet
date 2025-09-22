"use client";
import Link from "next/link";
import { useState } from "react";

export function SpeedyLink(props: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  let [prefetch, setPrefetch] = useState(false);
  return (
    <Link
      onMouseEnter={() => setPrefetch(true)}
      onPointerDown={() => setPrefetch(true)}
      style={props.style}
      prefetch={prefetch}
      href={props.href}
      className={props.className}
    >
      {props.children}
    </Link>
  );
}
