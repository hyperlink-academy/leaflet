import { createContext, useContext } from "react";
import type { EditorCommentInfo } from "./usePageEditorComments";

type EditorCommentContextValue = {
  pageID: string;
  comments: EditorCommentInfo[];
};

export const EditorCommentContext = createContext<EditorCommentContextValue>({
  pageID: "",
  comments: [],
});

export function useEditorCommentContext() {
  return useContext(EditorCommentContext);
}
