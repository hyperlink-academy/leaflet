"use client";
import { createContext } from "react";

type RequestHeaders = {
  language: string | null;
  timezone: string | null;
};

export const RequestHeadersContext = createContext<RequestHeaders>({
  language: null,
  timezone: null,
});

export const RequestHeadersProvider = (props: {
  language: string | null;
  timezone: string | null;
  children: React.ReactNode;
}) => {
  return (
    <RequestHeadersContext.Provider
      value={{
        language: props.language,
        timezone: props.timezone,
      }}
    >
      {props.children}
    </RequestHeadersContext.Provider>
  );
};
