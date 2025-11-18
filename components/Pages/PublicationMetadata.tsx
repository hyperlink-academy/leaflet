import Link from "next/link";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useRef } from "react";
import { useReplicache } from "src/replicache";
import { AsyncValueAutosizeTextarea } from "components/utils/AutosizeTextarea";
import { Separator } from "components/Layout";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";
import {
  getBasePublicationURL,
  getPublicationURL,
} from "app/lish/createPub/getPublicationURL";
import { useSubscribe } from "src/replicache/useSubscribe";
import { useEntitySetContext } from "components/EntitySetProvider";
import { timeAgo } from "src/utils/timeAgo";
import { useIdentityData } from "components/IdentityProvider";
export const PublicationMetadata = () => {
  let { rep } = useReplicache();
  let { data: pub } = useLeafletPublicationData();
  let { identity } = useIdentityData();
  let title = useSubscribe(rep, (tx) => tx.get<string>("publication_title"));
  let description = useSubscribe(rep, (tx) =>
    tx.get<string>("publication_description"),
  );
  let record = pub?.documents?.data as PubLeafletDocument.Record | null;
  let publishedAt = record?.publishedAt;

  if (!pub) return null;

  if (typeof title !== "string") {
    title = pub?.title || "";
  }
  if (typeof description !== "string") {
    description = pub?.description || "";
  }
  return (
    <div className={`flex flex-col px-3 sm:px-4 pb-5 sm:pt-3 pt-2`}>
      <div className="flex gap-2">
        {pub.publications && (
          <Link
            href={
              identity?.atp_did === pub.publications?.identity_did
                ? `${getBasePublicationURL(pub.publications)}/dashboard`
                : getPublicationURL(pub.publications)
            }
            className="leafletMetadata text-accent-contrast font-bold hover:no-underline"
          >
            {pub.publications?.name}
          </Link>
        )}
        <div className="font-bold text-tertiary px-1 text-sm flex place-items-center bg-border-light rounded-md ">
          Editor
        </div>
      </div>
      <TextField
        className="text-xl font-bold outline-hidden bg-transparent"
        value={title}
        onChange={async (newTitle) => {
          await rep?.mutate.updatePublicationDraft({
            title: newTitle,
            description,
          });
        }}
        placeholder="Untitled"
      />
      <TextField
        placeholder="add an optional description..."
        className="italic text-secondary outline-hidden bg-transparent"
        value={description}
        onChange={async (newDescription) => {
          await rep?.mutate.updatePublicationDraft({
            title,
            description: newDescription,
          });
        }}
      />
      {pub.doc ? (
        <div className="flex flex-row items-center gap-2 pt-3">
          <p className="text-sm text-tertiary">
            Published {publishedAt && timeAgo(publishedAt)}
          </p>
          <Separator classname="h-4" />
          <Link
            target="_blank"
            className="text-sm"
            href={
              pub.publications
                ? `${getPublicationURL(pub.publications)}/${new AtUri(pub.doc).rkey}`
                : `/p/${identity?.atp_did}/${new AtUri(pub.doc).rkey}`
            }
          >
            View Post
          </Link>
        </div>
      ) : (
        <p className="text-sm text-tertiary pt-2">Draft</p>
      )}
    </div>
  );
};

export const TextField = ({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => Promise<void>;
  className: string;
  placeholder: string;
}) => {
  let { undoManager } = useReplicache();
  let actionTimeout = useRef<number | null>(null);
  let { permissions } = useEntitySetContext();
  let previousSelection = useRef<null | { start: number; end: number }>(null);
  let ref = useRef<HTMLTextAreaElement | null>(null);
  return (
    <AsyncValueAutosizeTextarea
      ref={ref}
      disabled={!permissions.write}
      onSelect={(e) => {
        let start = e.currentTarget.selectionStart,
          end = e.currentTarget.selectionEnd;
        previousSelection.current = { start, end };
      }}
      className={className}
      value={value}
      onBlur={async () => {
        if (actionTimeout.current) {
          undoManager.endGroup();
          window.clearTimeout(actionTimeout.current);
          actionTimeout.current = null;
        }
      }}
      onChange={async (e) => {
        let newValue = e.currentTarget.value;
        let oldValue = value;
        let start = e.currentTarget.selectionStart,
          end = e.currentTarget.selectionEnd;
        await onChange(e.currentTarget.value);

        if (actionTimeout.current) {
          window.clearTimeout(actionTimeout.current);
        } else {
          undoManager.startGroup();
        }

        actionTimeout.current = window.setTimeout(() => {
          undoManager.endGroup();
          actionTimeout.current = null;
        }, 200);
        let previousStart = previousSelection.current?.start || null,
          previousEnd = previousSelection.current?.end || null;
        undoManager.add({
          redo: async () => {
            await onChange(newValue);
            ref.current?.setSelectionRange(start, end);
            ref.current?.focus();
          },
          undo: async () => {
            await onChange(oldValue);
            ref.current?.setSelectionRange(previousStart, previousEnd);
            ref.current?.focus();
          },
        });
      }}
      placeholder={placeholder}
    />
  );
};

export const PublicationMetadataPreview = () => {
  let { data: pub } = useLeafletPublicationData();
  let record = pub?.documents?.data as PubLeafletDocument.Record | null;
  let publishedAt = record?.publishedAt;

  if (!pub || !pub.publications) return null;

  return (
    <div className={`flex flex-col px-3 sm:px-4 pb-5 sm:pt-3 pt-2`}>
      <div className="text-accent-contrast font-bold hover:no-underline">
        {pub.publications?.name}
      </div>

      <div
        className={`text-xl font-bold outline-hidden bg-transparent ${!pub.title && "text-tertiary italic"}`}
      >
        {pub.title ? pub.title : "Untitled"}
      </div>
      <div className="italic text-secondary outline-hidden bg-transparent">
        {pub.description}
      </div>

      {pub.doc ? (
        <div className="flex flex-row items-center gap-2 pt-3">
          <p className="text-sm text-tertiary">
            Published {publishedAt && timeAgo(publishedAt)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-tertiary pt-2">Draft</p>
      )}
    </div>
  );
};
