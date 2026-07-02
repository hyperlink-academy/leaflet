"use client";
import { createContext } from "react";

type RequestHeaders = {
  country: string | null;
  language: string | null;
  timezone: string | null;
};

// No provider mounts this anymore: reading request headers in the shared
// layout forced every page dynamic. Consumers (useLocalizedDate) fall back to
// UTC/en-US for the prerendered first paint and switch to the browser's own
// locale/timezone after hydration.
export const RequestHeadersContext = createContext<RequestHeaders>({
  country: null,
  language: null,
  timezone: null,
});
