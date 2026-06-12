import { createContext, useContext } from "react";
import type { CommentInfo } from "./usePageComments";

type CommentContextValue = {
  pageID: string;
  comments: CommentInfo[];
  resolvedCommentIDs: string[];
};

export const CommentContext = createContext<CommentContextValue>({
  pageID: "",
  comments: [],
  resolvedCommentIDs: [],
});

export function useCommentContext() {
  return useContext(CommentContext);
}
