import { createContext, useContext } from "react";

// Set by a LimitedLeafletEditor (a question's answer) around its blocks. Its
// text blocks don't open the block menu on "/": an answer only publishes
// self-contained blocks, and its formatting buttons sit in the composer
// around it.
export const IsLimitedContext = createContext(false);

export function useIsLimited() {
  return useContext(IsLimitedContext);
}
