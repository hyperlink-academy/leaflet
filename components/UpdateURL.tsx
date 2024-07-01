"use client";
import { useEffect } from "react";

export function UpdateURL(props: { url: string }) {
  useEffect(() => {
    window.history.replaceState(null, "", props.url);
  }, [props.url]);
  return null;
}
