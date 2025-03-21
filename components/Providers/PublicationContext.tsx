"use client";
import { createContext, useContext, ReactNode } from "react";

interface PublicationContextType {
  publication: { uri: string; name: string } | null;
}

const PublicationContext = createContext<PublicationContextType | undefined>(
  undefined,
);

export function PublicationContextProvider({
  children,
  publication,
}: {
  children: ReactNode;
  publication: PublicationContextType["publication"];
}) {
  return (
    <PublicationContext.Provider value={{ publication }}>
      {children}
    </PublicationContext.Provider>
  );
}

export function usePublicationContext() {
  const context = useContext(PublicationContext);
  if (context === undefined) {
    throw new Error("usePublication must be used within a PublicationProvider");
  }
  return context;
}
