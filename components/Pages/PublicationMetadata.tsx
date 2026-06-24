import Link from "next/link";
import Image from "next/image";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useRef, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { v7 } from "uuid";
import { addImage, localImages } from "src/utils/addImage";
import { CoverImageTiny } from "components/Icons/CoverImageTiny";
import { AsyncValueAutosizeTextarea } from "components/utils/AutosizeTextarea";
import { Separator } from "components/Layout";
import { AtUri } from "@atproto/syntax";
import {
  getBasePublicationURL,
  getPublicationURL,
} from "app/(app)/lish/createPub/getPublicationURL";
import { useSubscribe } from "src/replicache/useSubscribe";
import { useEntitySetContext } from "components/EntitySetProvider";
import { timeAgo } from "src/utils/timeAgo";
import { CommentTiny } from "components/Icons/CommentTiny";
import { TagTiny } from "components/Icons/TagTiny";
import { Popover } from "components/Popover";
import { TagSelector } from "components/Tags";
import { useIdentityData } from "components/IdentityProvider";
import { PostHeaderLayout } from "app/(app)/lish/[did]/[publication]/[rkey]/PostHeader/PostHeader";
import { Backdater } from "./Backdater";
import { RecommendTinyEmpty } from "components/Icons/RecommendTiny";
import { mergePreferences } from "src/utils/mergePreferences";
import { DraftContributorSelector } from "./DraftContributorSelector";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";

export const PublicationMetadata = (props: { noInteractions?: boolean }) => {
  let { rep, permission_token } = useReplicache();
  let leaflet_id = permission_token.id;
  let {
    data: pub,
    normalizedDocument,
    normalizedPublication,
  } = useLeafletPublicationData();
  let { identity } = useIdentityData();
  let title = useSubscribe(rep, (tx) => tx.get<string>("publication_title"));
  let description = useSubscribe(rep, (tx) =>
    tx.get<string>("publication_description"),
  );
  let postPreferences = useSubscribe(rep, (tx) =>
    tx.get<{
      showComments?: boolean;
      showMentions?: boolean;
      showRecommends?: boolean;
    } | null>("post_preferences"),
  );
  let merged = mergePreferences(
    postPreferences || undefined,
    normalizedPublication?.preferences,
  );
  let publishedAt = normalizedDocument?.publishedAt;

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
              className="leafletMetadata text-accent-contrast font-bold no-underline!"
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
          className="leading-tight pt-0.5 text-2xl font-bold outline-hidden bg-transparent"
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
          className=""
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
          <div className="flex gap-1 items-center">
            {pub.publications && leaflet_id && (
              <>
                <DraftContributorSelector leaflet_id={leaflet_id} />
              </>
            )}
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
          </div>
          {!props.noInteractions && (
            <div className="flex gap-2 text-border items-center">
              {merged.showRecommends !== false && (
                <div className="flex gap-1 items-center">
                  <RecommendTinyEmpty />—
                </div>
              )}

              {(merged.showComments !== false ||
                merged.showMentions !== false) && (
                <div className="flex gap-1 items-center">
                  <CommentTiny />—
                </div>
              )}
              {tags && (
                <>
                  {merged.showRecommends !== false ||
                  merged.showMentions !== false ||
                  merged.showComments !== false ? (
                    <Separator classname="h-4!" />
                  ) : null}
                  <AddTags />
                  <Separator classname="h-4!" />

                  <AddCoverImage />
                </>
              )}
            </div>
          )}
        </>
      }
    />
  );
};

const TextField = ({
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
  let { data: pub, normalizedDocument } = useLeafletPublicationData();
  let publishedAt = normalizedDocument?.publishedAt;

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

export const AddTags = () => {
  let { data: pub, normalizedDocument } = useLeafletPublicationData();
  let { rep } = useReplicache();

  // Get tags from Replicache local state or published document
  let replicacheTags = useSubscribe(rep, (tx) =>
    tx.get<string[]>("publication_tags"),
  );

  // Determine which tags to use - prioritize Replicache state
  let tags: string[] = [];
  if (Array.isArray(replicacheTags)) {
    tags = replicacheTags;
  } else if (
    normalizedDocument?.tags &&
    Array.isArray(normalizedDocument.tags)
  ) {
    tags = normalizedDocument.tags as string[];
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
          {tags.length > 0 ? (
            `${tags.length} Tag${tags.length === 1 ? "" : "s"}`
          ) : (
            <div className="sm:block hidden">Add Tags</div>
          )}
        </div>
      }
    >
      <TagSelector selectedTags={tags} setSelectedTags={handleTagsChange} />
    </Popover>
  );
};

export const AddCoverImage = () => {
  let { rep, rootEntity } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: pub } = useLeafletPublicationData();

  let coverEntity =
    useEntity(rootEntity, "root/cover-image")?.data.value ?? null;
  let coverImage = useEntity(coverEntity, "block/image");
  let localSrc = coverImage ? localImages.get(coverImage.data.src) : undefined;
  let replaceInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    if (!rep || !file.type.startsWith("image/")) return;
    let imageEntity = v7();
    await rep.mutate.createEntity([
      { entityID: imageEntity, permission_set: entity_set.set },
    ]);
    await addImage(file, rep, {
      entityID: imageEntity,
      attribute: "block/image",
      ignoreUndo: true,
    });
    await rep.mutate.assertFact({
      entity: rootEntity,
      attribute: "root/cover-image",
      data: { type: "reference", value: imageEntity },
      ignoreUndo: true,
    });
  };

  // Cover images are a publication-post concept, and only editors can set one.
  if (!pub?.publications || !entity_set.permissions.write) return null;

  if (!coverEntity)
    return (
      <label
        className="addCoverImageTrigger flex gap-1 hover:underline text-sm items-center text-tertiary hover:cursor-pointer"
        onMouseDown={(e) => e.preventDefault()}
      >
        <CoverImageTiny />
        Add Cover
        <input
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(e) => {
            let file = e.currentTarget.files?.[0];
            if (file) handleFile(file);
            e.currentTarget.value = "";
          }}
        />
      </label>
    );

  return (
    <Popover
      className="w-sm flex flex-col gap-2"
      trigger={
        <div className="flex flex-row gap-1 shrink-0 items-center hover:underline text-tertiary">
          <CoverImageTiny />
          <div className="sm:block hidden">Edit Cover</div>
        </div>
      }
    >
      {coverImage &&
        (localSrc || coverImage.data.local ? (
          <img
            loading="lazy"
            decoding="async"
            src={localSrc ?? coverImage.data.fallback}
            className="w-full aspect-video object-cover rounded-md border border-border-light"
            alt=""
          />
        ) : (
          <Image
            src={
              "/" +
              new URL(coverImage.data.src).pathname
                .split("/")
                .slice(5)
                .join("/")
            }
            width={coverImage.data.width}
            height={coverImage.data.height}
            className="w-full aspect-video object-cover rounded-md border border-border-light"
            alt=""
          />
        ))}
      <div className="flex gap-2 place-self-end">
        <ButtonTertiary
          compact
          type="button"
          className="text-sm "
          onClick={() => rep?.mutate.deleteEntity({ entity: coverEntity })}
        >
          Remove
        </ButtonTertiary>

        <ButtonPrimary
          compact
          type="button"
          className="changeCoverImageTrigger text-sm "
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => replaceInputRef.current?.click()}
        >
          Change Cover Image
        </ButtonPrimary>
        <input
          ref={replaceInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(e) => {
            let file = e.currentTarget.files?.[0];
            if (file) handleFile(file);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </Popover>
  );
};
