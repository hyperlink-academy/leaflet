"use client";
import { useEffect } from "react";
import { create } from "zustand";

export const useInitialPageLoad = create(() => false);
export function InitialPageLoad(props: { children: React.ReactNode }) {
  useEffect(() => {
    let listener = () => {
      console.log("firing listener", window.innerHeight, window.innerWidth);
      document.documentElement.style.setProperty(
        "--leaflet-height-unitless",
        window.innerHeight.toString(),
      );
      document.documentElement.style.setProperty(
        "--leaflet-width-unitless",
        window.innerWidth.toString(),
      );
    };
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  });
  useEffect(() => {
    setTimeout(() => {
      useInitialPageLoad.setState(() => true);
    }, 80);
  }, []);
  return <>{props.children}</>;
}
