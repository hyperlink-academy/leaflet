"use client";
import { createContext } from "react";

export type RequestHeaders = {
  country: string | null;
  language: string | null;
  timezone: string | null;
};

export const RequestHeadersContext = createContext<RequestHeaders>({
  country: null,
  language: null,
  timezone: null,
});

export const RequestHeadersProvider = (props: {
  country: string | null;
  language: string | null;
  timezone: string | null;
  children: React.ReactNode;
}) => {
  return (
    <RequestHeadersContext.Provider
      value={{
        country: props.country,
        language: props.language,
        timezone: props.timezone,
      }}
    >
      {props.children}
    </RequestHeadersContext.Provider>
  );
};
