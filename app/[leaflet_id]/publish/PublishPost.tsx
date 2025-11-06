"use client";
import { publishToPublication } from "actions/publishToPublication";
import { DotLoader } from "components/utils/DotLoader";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { Checkbox } from "components/Checkbox";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AutosizeTextarea } from "components/utils/AutosizeTextarea";
import { PubLeafletPublication } from "lexicons/api";
import { publishPostToBsky } from "./publishBskyPost";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AtUri } from "@atproto/syntax";
import { PublishIllustration } from "./PublishIllustration/PublishIllustration";
import { Popover } from "components/Popover";
import { Input } from "components/Input";
import { useReplicache } from "src/replicache";
import { editorStateToFacetedText } from "./BskyPostEditorProsemirror";
import { EditorState } from "prosemirror-state";

type Props = {
  title: string;
  leaflet_id: string;
  root_entity: string;
  profile: ProfileViewDetailed;
  description: string;
  publication_uri: string;
  record?: PubLeafletPublication.Record;
  posts_in_pub?: number;
};

export function PublishPost(props: Props) {
  let [publishState, setPublishState] = useState<
    { state: "default" } | { state: "success"; post_url: string }
  >({ state: "default" });
  return (
    <div className="publishPage w-screen h-full flex sm:pt-0 pt-4 sm:place-items-center justify-center">
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
  let [shareOption, setShareOption] = useState<{
    email: boolean;
    bluesky: boolean;
  }>({
    email: true,
    bluesky: true,
  });

  let editorStateRef = useRef<EditorState | null>(null);
  let [isLoading, setIsLoading] = useState(false);
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
    });
    if (!doc) return;

    let post_url = `https://${props.record?.base_path}/${doc.rkey}`;
    let [text, facets] = editorStateRef.current
      ? editorStateToFacetedText(editorStateRef.current)
      : [];
    if (shareOption.bluesky === true)
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

  let subscribers = 12;

  return (
    <div className="flex flex-col gap-1.5 w-[640px] max-w-full sm:px-4 px-3">
      <h3>Publish This Post!</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="container flex flex-col gap-3 p-3 pt-2 sm:pt-3 sm:p-4">
          <div className="flex flex-col ">
            <div className=" flex justify-between items-center">
              <Checkbox
                checked={shareOption.email === true}
                onChange={(e) => {
                  if (shareOption.email === true) {
                    setShareOption({ ...shareOption, email: false });
                  } else {
                    setShareOption({ ...shareOption, email: true });
                  }
                }}
              >
                <div className="font-bold">
                  Email {subscribers} Subscriber
                  {subscribers === 1 ? "" : "s"}
                </div>
              </Checkbox>
              <SendTest checked={shareOption.email} />
            </div>
          </div>
          <Checkbox
            checked={shareOption.bluesky === true}
            onChange={(e) => {
              if (shareOption.bluesky === true) {
                setShareOption({ ...shareOption, bluesky: false });
              } else {
                setShareOption({ ...shareOption, bluesky: true });
              }
            }}
          >
            <div className="flex flex-col font-normal w-full gap-0.5">
              <div className="font-bold">Share on Bluesky</div>
              <div
                className={`w-full ${shareOption.bluesky === false ? "opacity-50" : ""}`}
              >
                <BskyPostComposer
                  profile={props.profile}
                  title={props.title}
                  description={props.description}
                  base_path={props.record?.base_path}
                  postContent={postContent}
                  setPostContent={setPostContent}
                />
              </div>
            </div>
          </Checkbox>
          <hr className="border-border-light mt-1" />

          <div className="flex justify-between">
            <Link
              className="hover:no-underline! font-bold"
              href={`/${params.leaflet_id}`}
            >
              Back
            </Link>
            <div className="flex gap-2 items-center">
              <ButtonPrimary type="submit" className="place-self-end h-[30px]">
                {isLoading ? (
                  <DotLoader />
                ) : shareOption.email === false &&
                  shareOption.bluesky === false ? (
                  "Post Quietly"
                ) : shareOption.email === true ? (
                  `Publish to ${subscribers} Subscriber${subscribers === 1 ? "!" : "s!"}`
                ) : (
                  "Publish this Post!"
                )}
              </ButtonPrimary>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

const PublishPostSuccess = (props: {
  post_url: string;
  publication_uri: string;
  record: Props["record"];
  posts_in_pub: number;
}) => {
  let uri = new AtUri(props.publication_uri);
  return (
    <div className="container p-4 m-3 sm:m-4 flex flex-col gap-1 justify-center text-center w-fit h-fit mx-auto">
      <PublishIllustration posts_in_pub={props.posts_in_pub} />
      <h2 className="pt-2">Published!</h2>
      <Link
        className="hover:no-underline! font-bold place-self-center pt-2"
        href={`/lish/${uri.host}/${encodeURIComponent(props.record?.name || "")}/dashboard`}
      >
        <ButtonPrimary>Back to Dashboard</ButtonPrimary>
      </Link>
      <a href={props.post_url}>See published post</a>
    </div>
  );
};

const SendTest = (props: { checked: boolean }) => {
  /* Prefill email with the one we have for thier account */
  let [emailInputValue, setEmailInputValue] = useState(
    "thisiscelinepark@gmail.com",
  );
  return (
    <Popover
      asChild
      trigger={
        <ButtonTertiary disabled={!props.checked}>Send Test</ButtonTertiary>
      }
      className="max-w-xs w-[1000px]"
    >
      <form action={() => {}}>
        <div className="subscribeEmailInput relative my-1">
          <Input
            type="email"
            className="input-with-border w-full! pr-9!"
            placeholder="me@email.com"
            value={emailInputValue}
            onChange={(e) => setEmailInputValue(e.target.value)}
          />
          <ButtonPrimary
            compact
            disabled={emailInputValue === "" || !emailInputValue}
            className="absolute right-1 top-1 h-[22px]! w-fit! outline-0!"
            style={{ height: "22px", width: "22px" }}
            type="submit"
          >
            Send
          </ButtonPrimary>
        </div>
      </form>
    </Popover>
  );
};

const BskyPostComposer = (props: {
  profile: ProfileViewDetailed;
  title: string;
  description: string;
  base_path: string | undefined;
  postContent: string;
  setPostContent: (p: string) => void;
}) => {
  return (
    <div className="opaque-container p-2  pr-3 !rounded-lg">
      <div className="flex gap-2">
        <img
          className="rounded-full w-6 h-6 sm:w-8 sm:h-8 shrink-0"
          src={props.profile.avatar}
        />
        <div className="flex flex-col w-full text-sm">
          <div className="flex gap-2">
            <p className="font-bold">{props.profile.displayName}</p>
            <p className="text-tertiary">@{props.profile.handle}</p>
          </div>
          <AutosizeTextarea
            className="text-sm font-normal"
            value={props.postContent}
            onChange={(e) =>
              props.setPostContent(e.currentTarget.value.slice(0, 300))
            }
            placeholder="Write a post to share your writing!"
          />
          <div className="opaque-container overflow-hidden flex flex-col mt-[10px] w-full text-sm">
            <div className="flex flex-col px-2 py-[6px]">
              <div className="font-bold">{props.title}</div>
              <div className="text-tertiary">{props.description}</div>
              <hr className="border-border-light mt-2 mb-0.5" />
              <p className="text-xs text-tertiary">{props.base_path}</p>
            </div>
          </div>
          <div className="text-xs text-tertiary italic place-self-end pt-0.5">
            {props.postContent.length}/300
          </div>
        </div>
      </div>
    </div>
  );
};
