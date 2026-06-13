import { createContext, useContext } from "react";
import type { CommentInfo } from "./usePageComments";

type CommentContextValue = {
  pageID: string;
  comments: CommentInfo[];
};

export const CommentContext = createContext<CommentContextValue>({
  pageID: "",
  comments: [],
});

export function useCommentContext() {
  return useContext(CommentContext);
}
