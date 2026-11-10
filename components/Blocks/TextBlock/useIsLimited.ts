import { createContext, useContext } from "react";

export const IsLimitedContext = createContext(false);

export function useIsLimited() {
  return useContext(IsLimitedContext);
}
