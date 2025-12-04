"use client";
import { useEffect } from "react";
import { create } from "zustand";

export const useHasPageLoaded = create(() => false);
export function InitialPageLoad(props: { children: React.ReactNode }) {
  useEffect(() => {
    setTimeout(() => {
      useHasPageLoaded.setState(() => true);
    }, 80);
  }, []);
  return <>{props.children}</>;
}
