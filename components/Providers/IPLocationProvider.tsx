"use client";
import { createContext } from "react";

export const IPLocationContext = createContext<string | null>(null);
export const IPLocationProvider = (props: {
  country: string | null;
  children: React.ReactNode;
}) => {
  return (
    <IPLocationContext.Provider value={props.country}>
      {props.children}
    </IPLocationContext.Provider>
  );
};
