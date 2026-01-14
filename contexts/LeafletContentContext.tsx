"use client";
import { createContext, useContext } from "react";
import type { PubLeafletContent } from "lexicons/api";

export type Page = PubLeafletContent.Main["pages"][number];

export type LeafletContentContextValue = {
  pages: Page[];
};

const LeafletContentContext = createContext<LeafletContentContextValue | null>(null);

export function useLeafletContent() {
  const ctx = useContext(LeafletContentContext);
  if (!ctx) throw new Error("useLeafletContent must be used within LeafletContentProvider");
  return ctx;
}

export function useLeafletContentOptional() {
  return useContext(LeafletContentContext);
}

export function LeafletContentProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: LeafletContentContextValue;
}) {
  return (
    <LeafletContentContext.Provider value={value}>
      {children}
    </LeafletContentContext.Provider>
  );
}
