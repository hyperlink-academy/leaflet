import { AtUri } from "@atproto/api";
import { publishComment, updateComment } from "./commentAction";
import { PubLeafletComment } from "lexicons/api";
import { ShareSmall } from "components/Icons/ShareSmall";
import { useInteractionState, setInteractionState } from "../Interactions";
import { QUOTE_PARAM, decodeQuotePosition } from "src/utils/quotePosition";
import { QuoteContent } from "../Quotes";
import { CloseFillTiny } from "components/Icons/CloseFillTiny";
import { useToaster } from "components/Toast";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";
import { useIdentityData } from "components/IdentityProvider";
import { useRecordFromDid } from "src/utils/useRecordFromDid";
import { Avatar } from "components/Avatar";
import { FacetedTextComposer } from "components/FacetedTextComposer";
import {
  facetedTextToDoc,
  type FacetedText,
} from "components/FacetedTextComposer/facetedText";

export function CommentBox(props: {
  doc_uri: string;
  pageId?: string;
  replyTo?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
  // Edits an existing comment in place: the editor is seeded from the record,
  // submit updates it, and the quote attachment is kept as-is.
  editing?: { uri: string; record: PubLeafletComment.Record };
  onCancel?: () => void;
}) {
  // Scope the persisted draft to this post, and separately to each reply
  // composer, so reloading restores the right in-progress comment. Edits
  // aren't persisted: a reload should show the published text again.
  let draftKey = props.editing
    ? null
    : `comment:${props.doc_uri}${
        props.replyTo ? `:reply:${props.replyTo}` : ""
      }`;
  let {
    commentBox: { quote: draftQuote },
  } = useInteractionState(props.doc_uri);
  let quote = props.editing ? null : draftQuote;
  let toaster = useToaster();
  let { identity } = useIdentityData();
  let { data: record } = useRecordFromDid(identity?.atp_did);

  let submit = async ({ plaintext, facets }: FacetedText) => {
    if (props.editing) {
      let editing = props.editing;
      let result = await updateComment({
        uri: editing.uri,
        plaintext,
        facets,
      });
      if (!result.success) {
        toaster({
          content: isOAuthSessionError(result.error) ? (
            <OAuthErrorMessage error={result.error} />
          ) : (
            "We couldn't update this. Please try again!"
          ),
          type: "error",
        });
        return false;
      }
      setInteractionState(props.doc_uri, (s) => ({
        editedComments: { ...s.editedComments, [editing.uri]: result.record },
      }));
      props.onSubmit?.();
      return false;
    }
    let result = await publishComment({
      pageId: props.pageId,
      document: props.doc_uri,
      comment: {
        plaintext,
        facets,
        replyTo: props.replyTo,
        attachment: quote
          ? {
              $type: "pub.leaflet.comment#linearDocumentQuote",
              document: props.doc_uri,
              quote,
            }
          : undefined,
      },
    });
    if (!result.success) {
      toaster({
        content: isOAuthSessionError(result.error) ? (
          <OAuthErrorMessage error={result.error} />
        ) : (
          "We couldn't post this. Please try again!"
        ),
        type: "error",
      });
      return false;
    }
    props.onSubmit?.();
    setInteractionState(props.doc_uri, (s) => ({
      commentBox: { quote: null },
      localComments: [
        ...s.localComments,
        {
          record: result.record,
          uri: result.uri,
          profile: {
            did: new AtUri(result.uri).host,
            handle: record?.handle ?? null,
            displayName:
              record?.displayName ??
              (result.profile as { displayName?: string } | null)
                ?.displayName ??
              null,
            avatar: record?.avatar ?? null,
            description: record?.description ?? null,
          },
        },
      ],
    }));
    return true;
  };

  return (
    <FacetedTextComposer
      className={props.className}
      draftKey={draftKey}
      initialDoc={
        props.editing
          ? facetedTextToDoc(
              props.editing.record.plaintext,
              props.editing.record.facets ?? [],
            )
          : undefined
      }
      autoFocus={props.autoFocus}
      onCancel={props.onCancel}
      cancelLabel={props.editing ? "Cancel" : undefined}
      submitLabel={props.editing ? "Update" : <ShareSmall />}
      onSubmit={submit}
      onPasteText={(text) => {
        if (
          !text.includes(QUOTE_PARAM) ||
          !text.includes(window.location.toString())
        )
          return false;
        const url = new URL(text);
        const quoteParam = url.pathname.split("/l-quote/")[1];
        if (!quoteParam) return false;
        const quotePosition = decodeQuotePosition(quoteParam);
        if (!quotePosition) return false;
        setInteractionState(props.doc_uri, {
          commentBox: { quote: quotePosition },
        });
        return true;
      }}
      above={
        quote && (
          <div className="relative mt-2 mb-2">
            <QuoteContent position={quote} did="" index={-1} />
            <button
              className="text-border absolute -top-3 right-1 bg-bg-page p-1 rounded-full"
              onClick={() =>
                setInteractionState(props.doc_uri, {
                  commentBox: { quote: null },
                })
              }
            >
              <CloseFillTiny />
            </button>
          </div>
        )
      }
      trailing={
        record && (
          <Avatar
            src={record.avatar}
            displayName={record.displayName || record.handle}
            size="small"
          />
        )
      }
    />
  );
}
