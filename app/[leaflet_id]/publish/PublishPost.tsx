"use client";
import { publishToPublication } from "actions/publishToPublication";
import { DotLoader } from "components/utils/DotLoader";
import { useState, useRef } from "react";
import { ButtonPrimary } from "components/Buttons";
import { Radio } from "components/Checkbox";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PubLeafletPublication } from "lexicons/api";
import { publishPostToBsky } from "./publishBskyPost";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AtUri } from "@atproto/syntax";
import { PublishIllustration } from "./PublishIllustration/PublishIllustration";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import {
  BlueskyPostEditorProsemirror,
  editorStateToFacetedText,
} from "./BskyPostEditorProsemirror";
import { EditorState } from "prosemirror-state";
import { TagSelector } from "../../../components/Tags";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { PubIcon } from "components/ActionBar/Publications";

type Props = {
  title: string;
  leaflet_id: string;
  root_entity: string;
  profile: ProfileViewDetailed;
  description: string;
  publication_uri?: string;
  record?: PubLeafletPublication.Record;
  posts_in_pub?: number;
  entitiesToDelete?: string[];
  hasDraft: boolean;
};

export function PublishPost(props: Props) {
  let [publishState, setPublishState] = useState<
    { state: "default" } | { state: "success"; post_url: string }
  >({ state: "default" });
  return (
    <div className="publishPage w-screen h-full bg-bg-page flex sm:pt-0 pt-4 sm:place-items-center justify-center text-primary">
      {publishState.state === "default" ? (
        <PublishPostForm setPublishState={setPublishState} {...props} />
      ) : (
        <PublishPostSuccess
          record={props.record}
          publication_uri={props.publication_uri}
          post_url={publishState.post_url}
          posts_in_pub={(props.posts_in_pub || 0) + 1}
        />
      )}
    </div>
  );
}

const PublishPostForm = (
  props: {
    setPublishState: (s: { state: "success"; post_url: string }) => void;
  } & Props,
) => {
  let editorStateRef = useRef<EditorState | null>(null);
  let [charCount, setCharCount] = useState(0);
  let [shareOption, setShareOption] = useState<"bluesky" | "quiet">("bluesky");
  let [isLoading, setIsLoading] = useState(false);
  let params = useParams();
  let { rep } = useReplicache();

  // For publications with drafts, use Replicache; otherwise use local state
  let replicacheTags = useSubscribe(rep, (tx) =>
    tx.get<string[]>("publication_tags"),
  );
  let [localTags, setLocalTags] = useState<string[]>([]);

  // Use Replicache tags only when we have a draft
  const hasDraft = props.hasDraft;
  const currentTags = hasDraft
    ? Array.isArray(replicacheTags)
      ? replicacheTags
      : []
    : localTags;

  // Update tags via Replicache mutation or local state depending on context
  const handleTagsChange = async (newTags: string[]) => {
    if (hasDraft) {
      await rep?.mutate.updatePublicationDraft({
        tags: newTags,
      });
    } else {
      setLocalTags(newTags);
    }
  };

  async function submit() {
    if (isLoading) return;
    setIsLoading(true);
    await rep?.push();
    let doc = await publishToPublication({
      root_entity: props.root_entity,
      publication_uri: props.publication_uri,
      leaflet_id: props.leaflet_id,
      title: props.title,
      description: props.description,
      tags: currentTags,
      entitiesToDelete: props.entitiesToDelete,
    });
    if (!doc) return;

    // Generate post URL based on whether it's in a publication or standalone
    let post_url = props.record?.base_path
      ? `https://${props.record.base_path}/${doc.rkey}`
      : `https://leaflet.pub/p/${props.profile.did}/${doc.rkey}`;

    let [text, facets] = editorStateRef.current
      ? editorStateToFacetedText(editorStateRef.current)
      : [];
    if (shareOption === "bluesky")
      await publishPostToBsky({
        facets: facets || [],
        text: text || "",
        title: props.title,
        url: post_url,
        description: props.description,
        document_record: doc.record,
        rkey: doc.rkey,
      });
    setIsLoading(false);
    props.setPublishState({ state: "success", post_url });
  }

  return (
    <div className="flex flex-col gap-4 w-[640px] max-w-full sm:px-4 px-3 text-primary">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="container flex flex-col gap-3 sm:p-3 p-4">
          <PublishingTo
            publication_uri={props.publication_uri}
            record={props.record}
          />
          <hr className="border-border" />
          <ShareOptions
            setShareOption={setShareOption}
            shareOption={shareOption}
            charCount={charCount}
            setCharCount={setCharCount}
            editorStateRef={editorStateRef}
            {...props}
          />
          <hr className="border-border " />
          <div className="flex flex-col gap-2">
            <h4>Tags</h4>
            <TagSelector
              selectedTags={currentTags}
              setSelectedTags={handleTagsChange}
            />
          </div>
          <hr className="border-border mb-2" />

          <div className="flex justify-between">
            <Link
              className="hover:no-underline! font-bold"
              href={`/${params.leaflet_id}`}
            >
              Back
            </Link>
            <ButtonPrimary
              type="submit"
              className="place-self-end h-[30px]"
              disabled={charCount > 300}
            >
              {isLoading ? <DotLoader /> : "Publish this Post!"}
            </ButtonPrimary>
          </div>
        </div>
      </form>
    </div>
  );
};

const ShareOptions = (props: {
  shareOption: "quiet" | "bluesky";
  setShareOption: (option: typeof props.shareOption) => void;
  charCount: number;
  setCharCount: (c: number) => void;
  editorStateRef: React.MutableRefObject<EditorState | null>;
  title: string;
  profile: ProfileViewDetailed;
  description: string;
  record?: PubLeafletPublication.Record;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <h4>Notifications</h4>
      <Radio
        checked={props.shareOption === "quiet"}
        onChange={(e) => {
          if (e.target === e.currentTarget) {
            props.setShareOption("quiet");
          }
        }}
        name="share-options"
        id="share-quietly"
        value="Share Quietly"
      >
        <div className="flex flex-col">
          <div className="font-bold">Share Quietly</div>
          <div className="text-sm text-tertiary font-normal">
            No one will be notified about this post
          </div>
        </div>
      </Radio>
      <Radio
        checked={props.shareOption === "bluesky"}
        onChange={(e) => {
          if (e.target === e.currentTarget) {
            props.setShareOption("bluesky");
          }
        }}
        name="share-options"
        id="share-bsky"
        value="Share on Bluesky"
      >
        <div className="flex flex-col">
          <div className="font-bold">Share on Bluesky</div>
          <div className="text-sm text-tertiary font-normal">
            Pub subscribers will be updated via a custom Bluesky feed
          </div>
        </div>
      </Radio>
      <div
        className={`w-full pl-5 pb-4 ${props.shareOption !== "bluesky" ? "opacity-50" : ""}`}
      >
        <div className="opaque-container py-2 px-3 text-sm rounded-lg!">
          <div className="flex gap-2">
            <img
              className="rounded-full w-6 h-6 sm:w-[42px] sm:h-[42px] shrink-0"
              src={props.profile.avatar}
            />
            <div className="flex flex-col w-full">
              <div className="flex gap-2 ">
                <p className="font-bold">{props.profile.displayName}</p>
                <p className="text-tertiary">@{props.profile.handle}</p>
              </div>
              <div className="flex flex-col">
                <BlueskyPostEditorProsemirror
                  editorStateRef={props.editorStateRef}
                  onCharCountChange={props.setCharCount}
                />
              </div>
              <div className="opaque-container !border-border overflow-hidden flex flex-col mt-4 w-full">
                <div className="flex flex-col p-2">
                  <div className="font-bold">{props.title}</div>
                  <div className="text-tertiary">{props.description}</div>
                  <hr className="border-border mt-2 mb-1" />
                  <p className="text-xs text-tertiary">
                    {props.record?.base_path}
                  </p>
                </div>
              </div>
              <div className="text-xs text-secondary italic place-self-end pt-2">
                {props.charCount}/300
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PublishingTo = (props: {
  publication_uri?: string;
  record?: PubLeafletPublication.Record;
}) => {
  if (props.publication_uri && props.record) {
    return (
      <div className="flex flex-col gap-1">
        <h3>Publishing to</h3>
        <div className="flex gap-2 items-center p-2 rounded-md bg-[var(--accent-light)]">
          <PubIcon record={props.record} uri={props.publication_uri} />
          <div className="font-bold text-secondary">{props.record.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h3>Publishing as</h3>
      <div className="flex gap-2 items-center p-2 rounded-md bg-[var(--accent-light)]">
        <LooseLeafSmall className="shrink-0" />
        <div className="font-bold text-secondary">Looseleaf</div>
      </div>
    </div>
  );
};

const PublishPostSuccess = (props: {
  post_url: string;
  publication_uri?: string;
  record: Props["record"];
  posts_in_pub: number;
}) => {
  let uri = props.publication_uri ? new AtUri(props.publication_uri) : null;
  return (
    <div className="container p-4 m-3 sm:m-4 flex flex-col gap-1 justify-center text-center w-fit h-fit mx-auto">
      <PublishIllustration posts_in_pub={props.posts_in_pub} />
      <h2 className="pt-2">Published!</h2>
      {uri && props.record ? (
        <Link
          className="hover:no-underline! font-bold place-self-center pt-2"
          href={`/lish/${uri.host}/${encodeURIComponent(props.record.name || "")}/dashboard`}
        >
          <ButtonPrimary>Back to Dashboard</ButtonPrimary>
        </Link>
      ) : (
        <Link
          className="hover:no-underline! font-bold place-self-center pt-2"
          href="/"
        >
          <ButtonPrimary>Back to Home</ButtonPrimary>
        </Link>
      )}
      <a href={props.post_url}>See published post</a>
    </div>
  );
};
