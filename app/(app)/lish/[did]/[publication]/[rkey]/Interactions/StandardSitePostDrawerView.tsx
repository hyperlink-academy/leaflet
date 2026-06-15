"use client";
import { DotLoader } from "components/utils/DotLoader";
import { StandardSitePostItem } from "components/Blocks/StandardSitePostBlock/StandardSitePostItem";
import { DocumentProvider } from "contexts/DocumentContext";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { CommentsDrawerContent } from "./Comments";
import { MentionsDrawerContent } from "./Quotes";
import { useDocumentDiscussionData } from "./useDocumentDiscussionData";

// Renders a referenced post's discussion inside the interaction drawer: the
// post itself (as a StandardSitePostItem) at the top of the stack, then its
// comments or Bluesky mentions for the active tab. The tab is driven by the
// drawer header's toggle (InteractionDrawer), which shares the same fetch via
// SWR — this view is otherwise self-contained. Pushed onto the drawer's thread
// stack when a standard-site-post block's interactions are clicked from within
// a published post body, mirroring how a Bluesky post opens its thread.
export function StandardSitePostDrawerView(props: {
  uri: string;
  tab: "comments" | "quotes";
}) {
  const {
    isLoading,
    data,
    did,
    pages,
    documentContextValue,
    comments,
    quotesAndMentions,
  } = useDocumentDiscussionData(props.uri, true);

  return (
    <div className="standardSitePostDiscussion flex flex-col">
      <div className="standardSitePostBlock block-border overflow-hidden bg-bg-page mb-3">
        <StandardSitePostItem uri={props.uri} hideInteractions />
      </div>

      {!data && isLoading ? (
        <div className="flex items-center justify-center gap-1 text-tertiary italic text-sm py-8">
          <span>loading</span>
          <DotLoader />
        </div>
      ) : documentContextValue ? (
        <LeafletContentProvider value={{ pages }}>
          <DocumentProvider value={documentContextValue}>
            {props.tab === "comments" ? (
              <CommentsDrawerContent
                document_uri={props.uri}
                comments={comments}
              />
            ) : (
              <>
                <hr className="border-border-light mt-3 mb-6" />
                <MentionsDrawerContent
                  did={did}
                  quotesAndMentions={quotesAndMentions}
                />
              </>
            )}
          </DocumentProvider>
        </LeafletContentProvider>
      ) : null}
    </div>
  );
}
