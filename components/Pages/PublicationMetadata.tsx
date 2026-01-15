import Link from "next/link";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useRef, useState } from "react";
import { useReplicache } from "src/replicache";
import { AsyncValueAutosizeTextarea } from "components/utils/AutosizeTextarea";
import { Separator } from "components/Layout";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import {
  getBasePublicationURL,
  getPublicationURL,
} from "app/lish/createPub/getPublicationURL";
import { useSubscribe } from "src/replicache/useSubscribe";
import { useEntitySetContext } from "components/EntitySetProvider";
import { timeAgo } from "src/utils/timeAgo";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { TagTiny } from "components/Icons/TagTiny";
import { Popover } from "components/Popover";
import { TagSelector } from "components/Tags";
import { useIdentityData } from "components/IdentityProvider";
import { PostHeaderLayout } from "app/lish/[did]/[publication]/[rkey]/PostHeader/PostHeader";
import { Backdater } from "./Backdater";

export const PublicationMetadata = () => {
  let { rep } = useReplicache();
  let { data: pub } = useLeafletPublicationData();
  let { identity } = useIdentityData();
  let title = useSubscribe(rep, (tx) => tx.get<string>("publication_title"));
  let description = useSubscribe(rep, (tx) =>
    tx.get<string>("publication_description"),
  );
  let record = pub?.documents?.data as PubLeafletDocument.Record | null;
  let pubRecord = pub?.publications?.record as
    | PubLeafletPublication.Record
    | undefined;
  let publishedAt = record?.publishedAt;

  if (!pub) return null;

  if (typeof title !== "string") {
    title = pub?.title || "";
  }
  if (typeof description !== "string") {
    description = pub?.description || "";
  }
  let tags = true;

  return (
    <PostHeaderLayout
      pubLink={
        <div className="flex gap-2 items-center">
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
          <div className="font-bold text-tertiary px-1 h-[20px] text-sm flex place-items-center bg-border-light rounded-md ">
            DRAFT
          </div>
        </div>
      }
      postTitle={
        <TextField
          className="leading-tight pt-0.5 text-xl font-bold outline-hidden bg-transparent"
          value={title}
          onChange={async (newTitle) => {
            await rep?.mutate.updatePublicationDraft({
              title: newTitle,
              description,
            });
          }}
          placeholder="Untitled"
        />
      }
      postDescription={
        <TextField
          placeholder="add an optional description..."
          className="pt-1 italic text-secondary outline-hidden bg-transparent"
          value={description}
          onChange={async (newDescription) => {
            await rep?.mutate.updatePublicationDraft({
              title,
              description: newDescription,
            });
          }}
        />
      }
      postInfo={
        <>
          {pub.doc ? (
            <div className="flex gap-2 items-center">
              <p className="text-sm text-tertiary">
                Published{" "}
                {publishedAt && (
                  <Backdater publishedAt={publishedAt} docURI={pub.doc} />
                )}
              </p>

              <Link
                target="_blank"
                className="text-sm"
                href={
                  pub.publications
                    ? `${getPublicationURL(pub.publications)}/${new AtUri(pub.doc).rkey}`
                    : `/p/${new AtUri(pub.doc).host}/${new AtUri(pub.doc).rkey}`
                }
              >
                View
              </Link>
            </div>
          ) : (
            <p>Draft</p>
          )}
          <div className="flex gap-2 text-border items-center">
            {tags && (
              <>
                <AddTags />
                <Separator classname="h-4!" />
              </>
            )}
            {pubRecord?.preferences?.showMentions && (
              <div className="flex gap-1 items-center">
                <QuoteTiny />—
              </div>
            )}
            {pubRecord?.preferences?.showComments && (
              <div className="flex gap-1 items-center">
                <CommentTiny />—
              </div>
            )}
          </div>
        </>
      }
    />
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

  if (!pub) return null;

  return (
    <PostHeaderLayout
      pubLink={
        <div className="text-accent-contrast font-bold hover:no-underline">
          {pub.publications?.name}
        </div>
      }
      postTitle={pub.title}
      postDescription={pub.description}
      postInfo={
        pub.doc ? (
          <p>Published {publishedAt && timeAgo(publishedAt)}</p>
        ) : (
          <p>Draft</p>
        )
      }
    />
  );
};

const AddTags = () => {
  let { data: pub } = useLeafletPublicationData();
  let { rep } = useReplicache();
  let record = pub?.documents?.data as PubLeafletDocument.Record | null;

  // Get tags from Replicache local state or published document
  let replicacheTags = useSubscribe(rep, (tx) =>
    tx.get<string[]>("publication_tags"),
  );

  // Determine which tags to use - prioritize Replicache state
  let tags: string[] = [];
  if (Array.isArray(replicacheTags)) {
    tags = replicacheTags;
  } else if (record?.tags && Array.isArray(record.tags)) {
    tags = record.tags as string[];
  }

  // Update tags in replicache local state
  const handleTagsChange = async (newTags: string[]) => {
    // Store tags in replicache for next publish/update
    await rep?.mutate.updatePublicationDraft({
      tags: newTags,
    });
  };

  return (
    <Popover
      className="p-2! w-full min-w-xs"
      trigger={
        <div className="addTagTrigger flex gap-1 hover:underline text-sm items-center text-tertiary">
          <TagTiny />{" "}
          {tags.length > 0
            ? `${tags.length} Tag${tags.length === 1 ? "" : "s"}`
            : "Add Tags"}
        </div>
      }
    >
      <TagSelector selectedTags={tags} setSelectedTags={handleTagsChange} />
    </Popover>
  );
};
