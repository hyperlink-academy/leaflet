"use client";
import { publishToPublication } from "actions/publishToPublication";
import { DotLoader } from "components/utils/DotLoader";
import { useState, useRef } from "react";
import { ButtonPrimary } from "components/Buttons";
import { Radio } from "components/Checkbox";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AutosizeTextarea } from "components/utils/AutosizeTextarea";
import { PubLeafletPublication } from "lexicons/api";
import { publishPostToBsky } from "./publishBskyPost";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AtUri } from "@atproto/syntax";
import { PublishIllustration } from "./PublishIllustration/PublishIllustration";
import { useReplicache } from "src/replicache";
import {
  BlueskyPostEditorProsemirror,
  editorStateToFacetedText,
} from "./BskyPostEditorProsemirror";
import { EditorState } from "prosemirror-state";
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
};

export function PublishPost(props: Props) {
  let [publishState, setPublishState] = useState<
    { state: "default" } | { state: "success"; post_url: string }
  >({ state: "default" });
  return (
    <div className="publishPage w-screen h-full bg-bg-page flex sm:pt-0 pt-4 sm:place-items-center justify-center">
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
  let [shareOption, setShareOption] = useState<"bluesky" | "quiet">("bluesky");
  let editorStateRef = useRef<EditorState | null>(null);
  let [isLoading, setIsLoading] = useState(false);
  let [charCount, setCharCount] = useState(0);
  let params = useParams();
  let { rep } = useReplicache();

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
    <div className="flex flex-col gap-4 w-[640px] max-w-full sm:px-4 px-3">
      <h3>Publish Options</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="container flex flex-col gap-2 sm:p-3 p-4">
          <PublishingTo
            publication_uri={props.publication_uri}
            record={props.record}
          />
          <hr className="border-border-light my-1" />
          <Radio
            checked={shareOption === "quiet"}
            onChange={(e) => {
              if (e.target === e.currentTarget) {
                setShareOption("quiet");
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
            checked={shareOption === "bluesky"}
            onChange={(e) => {
              if (e.target === e.currentTarget) {
                setShareOption("bluesky");
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
            className={`w-full pl-5 pb-4 ${shareOption !== "bluesky" ? "opacity-50" : ""}`}
          >
            <div className="opaque-container p-3  rounded-lg!">
              <div className="flex gap-2">
                <img
                  className="rounded-full w-[42px] h-[42px] shrink-0"
                  src={props.profile.avatar}
                />
                <div className="flex flex-col w-full">
                  <div className="flex gap-2 pb-1">
                    <p className="font-bold">{props.profile.displayName}</p>
                    <p className="text-tertiary">@{props.profile.handle}</p>
                  </div>
                  <div className="flex flex-col">
                    <BlueskyPostEditorProsemirror
                      editorStateRef={editorStateRef}
                      onCharCountChange={setCharCount}
                    />
                  </div>
                  <div className="opaque-container overflow-hidden flex flex-col mt-4 w-full">
                    {/* <div className="h-[260px] w-full bg-test" /> */}
                    <div className="flex flex-col p-2">
                      <div className="font-bold">{props.title}</div>
                      <div className="text-tertiary">{props.description}</div>
                      <hr className="border-border-light mt-2 mb-1" />
                      <p className="text-xs text-tertiary">
                        {props.record?.base_path}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-secondary italic place-self-end pt-2">
                    {charCount}/300
                  </div>
                </div>
              </div>
            </div>
          </div>
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

const PublishingTo = (props: {
  publication_uri?: string;
  record?: PubLeafletPublication.Record;
}) => {
  if (props.publication_uri && props.record) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-sm text-tertiary">Publishing to…</div>
        <div className="flex gap-2 items-center p-2 rounded-md bg-[var(--accent-light)]">
          <PubIcon record={props.record} uri={props.publication_uri} />
          <div className="font-bold text-secondary">{props.record.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm text-tertiary">Publishing as…</div>
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
