"use client";
import { useEffect } from "react";
import { create } from "zustand";

export const useInitialPageLoad = create(() => false);
export function InitialPageLoad(props: { children: React.ReactNode }) {
  useEffect(() => {
    setTimeout(() => {
      useInitialPageLoad.setState(() => true);
    }, 80);
  }, []);
  return <>{props.children}</>;
}
