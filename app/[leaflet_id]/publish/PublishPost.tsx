"use client";
import { publishToPublication } from "actions/publishToPublication";
import { DotLoader } from "components/utils/DotLoader";
import { useState, useRef, type CSSProperties } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useParams } from "next/navigation";
import Link from "next/link";

import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { publishPostToBsky } from "./publishBskyPost";
import { ShareOptions, type ShareState } from "./ShareOptions";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AtUri } from "@atproto/syntax";
import { PublishIllustration } from "./PublishIllustration/PublishIllustration";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { editorStateToFacetedText } from "./BskyPostEditorProsemirror";
import { EditorState } from "prosemirror-state";
import { TagSelector } from "../../../components/Tags";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { PubIcon } from "components/ActionBar/Publications";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";
import { DatePicker, TimePicker } from "components/DatePicker";
import { Popover } from "components/Popover";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { Separator } from "react-aria-components";
import { setHours, setMinutes } from "date-fns";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { useEntity } from "src/replicache";
import { LeafletContent } from "app/(home-pages)/home/LeafletList/LeafletContent";

type Props = {
  title: string;
  leaflet_id: string;
  root_entity: string;
  profile: ProfileViewDetailed;
  description: string;
  publication_uri?: string;
  record?: NormalizedPublication | null;
  posts_in_pub?: number;
  newsletter_enabled?: boolean;
  subscriberCount?: number;
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
  let [state, setState] = useState<"post-details" | "share-options">(
    "post-details",
  );
  let [charCount, setCharCount] = useState(0);
  let [shareState, setShareState] = useState<ShareState>({
    bluesky: true,
    postToReaders: true,
    email: true,
    quiet: false,
  });
  let [isLoading, setIsLoading] = useState(false);
  const nothingSelected =
    !shareState.bluesky &&
    !shareState.postToReaders &&
    !shareState.email &&
    !shareState.quiet;
  let [oauthError, setOauthError] = useState<
    import("src/atproto-oauth").OAuthSessionError | null
  >(null);
  let params = useParams();
  let { rep } = useReplicache();

  // For publications with drafts, use Replicache; otherwise use local state
  let replicacheTags = useSubscribe(rep, (tx) =>
    tx.get<string[]>("publication_tags"),
  );
  let [localTags, setLocalTags] = useState<string[]>([]);
  let [showTagSelector, setShowTagSelector] = useState(false);

  let [localPublishedAt, setLocalPublishedAt] = useState<Date | undefined>(
    undefined,
  );
  // Get cover image from Replicache
  let replicacheCoverImage = useSubscribe(rep, (tx) =>
    tx.get<string | null>("publication_cover_image"),
  );

  // Get post preferences from Replicache state
  let postPreferences = useSubscribe(rep, (tx) =>
    tx.get<{
      showComments?: boolean;
      showMentions?: boolean;
      showRecommends?: boolean;
    } | null>("post_preferences"),
  );

  // Use Replicache tags only when we have a draft
  const currentTags = props.hasDraft
    ? Array.isArray(replicacheTags)
      ? replicacheTags
      : []
    : localTags;

  // Update tags via Replicache mutation or local state depending on context
  const handleTagsChange = async (newTags: string[]) => {
    if (props.hasDraft) {
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
    setOauthError(null);
    await rep?.push();
    let result = await publishToPublication({
      root_entity: props.root_entity,
      publication_uri: props.publication_uri,
      leaflet_id: props.leaflet_id,
      title: props.title,
      description: props.description,
      tags: currentTags,
      cover_image: replicacheCoverImage,
      entitiesToDelete: props.entitiesToDelete,
      publishedAt: localPublishedAt?.toISOString() || new Date().toISOString(),
      postPreferences,
    });

    if (!result.success) {
      setIsLoading(false);
      if (isOAuthSessionError(result.error)) {
        setOauthError(result.error);
      }
      return;
    }

    // Generate post URL based on whether it's in a publication or standalone
    let post_url = props.record?.url
      ? `${props.record.url}/${result.rkey}`
      : `https://leaflet.pub/p/${props.profile.did}/${result.rkey}`;

    let [text, facets] = editorStateRef.current
      ? editorStateToFacetedText(editorStateRef.current)
      : [];
    if (shareState.bluesky) {
      let bskyResult = await publishPostToBsky({
        facets: facets || [],
        text: text || "",
        title: props.title,
        url: post_url,
        description: props.description,
        document_record: result.record,
        rkey: result.rkey,
      });
      if (!bskyResult.success && isOAuthSessionError(bskyResult.error)) {
        setIsLoading(false);
        setOauthError(bskyResult.error);
        return;
      }
    }
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
        <div className="frosted-container flex flex-col gap-3 sm:p-3 p-4">
          {state === "post-details" ? (
            <>
              <h2>Publish: Post Details</h2>
              <PublishingTo
                publication_uri={props.publication_uri}
                record={props.record}
              />
              <hr className="border-border-light" />

              <BackdateOptions
                publishedAt={localPublishedAt}
                setPublishedAt={setLocalPublishedAt}
              />
              <hr className="border-border-light" />

              <div className="flex justify-between  gap-4">
                <div className="text-tertiary">Tags</div>
                <div className="grow ">
                  {currentTags.length !== 0 || showTagSelector === true ? (
                    <div className="sm:w-sm sm:justify-self-end">
                      <TagSelector
                        rightAlign
                        selectedTags={currentTags}
                        setSelectedTags={handleTagsChange}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="hover:underline font-bold text-secondary float-end"
                      onClick={() => {
                        setShowTagSelector(true);
                      }}
                    >
                      No Tags
                    </button>
                  )}
                </div>
              </div>
              <hr className="border-border-light" />
              <div className="flex justify-between sm:flex-row flex-col gap-4">
                <div className="text-tertiary shrink-0">Social Preview</div>
                <div className="opaque-container !border-border overflow-hidden flex flex-col w-full sm:max-w-sm rounded-lg!">
                  <SocialPreviewImage
                    rootEntity={props.root_entity}
                    did={props.profile.did}
                    coverImageCid={replicacheCoverImage ?? null}
                    publication_uri={props.publication_uri}
                    record={props.record}
                  />
                  <hr className="border-border" />
                  <div className="flex flex-col p-2 gap-0.5">
                    <div className="font-bold line-clamp-1">
                      {props.title || "Untitled"}
                    </div>
                    {props.description && (
                      <div className="text-sm text-tertiary line-clamp-2">
                        {props.description}
                      </div>
                    )}
                    <hr className="border-border-light mt-1 mb-0.5" />
                    <div className="text-xs text-tertiary">
                      {(props.record?.url || "leaflet.pub").replace(
                        /^https?:\/\//,
                        "",
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <hr className="border-border mb-2" />

              <div className="flex justify-between">
                <Link
                  className="hover:no-underline! font-bold"
                  href={`/${params.leaflet_id}`}
                >
                  Back
                </Link>
                <ButtonSecondary
                  type="button"
                  className="place-self-end h-[30px]"
                  onClick={() => setState("share-options")}
                >
                  Next: Share
                </ButtonSecondary>
              </div>
            </>
          ) : (
            <>
              <h2>Publish: Share Options</h2>
              <ShareOptions
                shareState={shareState}
                setShareState={setShareState}
                charCount={charCount}
                setCharCount={setCharCount}
                editorStateRef={editorStateRef}
                title={props.title}
                profile={props.profile}
                description={props.description}
                record={props.record}
                newsletter_enabled={props.newsletter_enabled}
                subscriberCount={props.subscriberCount}
                publication_uri={props.publication_uri}
                root_entity={props.root_entity}
              />
              <hr className="border-border mb-2" />

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <button
                    type="button"
                    className="font-bold text-accent-contrast"
                    onClick={() => setState("post-details")}
                  >
                    Back
                  </button>
                  <ButtonPrimary
                    type="submit"
                    className="place-self-end h-[30px]"
                    disabled={charCount > 300 || nothingSelected}
                  >
                    {isLoading ? (
                      <DotLoader className="h-[23px]" />
                    ) : (
                      "Publish this Post!"
                    )}
                  </ButtonPrimary>
                </div>
                {oauthError && (
                  <OAuthErrorMessage
                    error={oauthError}
                    className="text-right text-sm text-accent-contrast"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

const SocialPreviewImage = (props: {
  rootEntity: string;
  did: string;
  coverImageCid: string | null;
  publication_uri?: string;
  record?: NormalizedPublication | null;
}) => {
  const firstPage = useEntity(props.rootEntity, "root/page")[0];
  const page = firstPage?.data.value || props.rootEntity;

  if (props.coverImageCid) {
    return (
      <img
        src={`/api/atproto_images?did=${props.did}&cid=${props.coverImageCid}`}
        className="w-full object-cover aspect-video"
        alt=""
      />
    );
  }

  if (props.publication_uri && props.record) {
    return (
      <PublicationSocialPreview
        publication_uri={props.publication_uri}
        record={props.record}
        page={page}
      />
    );
  }

  return <EntitySocialPreview rootEntity={props.rootEntity} page={page} />;
};

const SocialPreviewFrame = (props: {
  page: string;
  wrapperStyle: CSSProperties;
}) => (
  <div
    inert
    className="w-full aspect-video overflow-hidden flex justify-center items-end pointer-events-none"
  >
    <div
      className="leafletContentWrapper h-full w-40 sm:w-48 pt-3 overflow-clip"
      style={props.wrapperStyle}
    >
      <LeafletContent entityID={props.page} isOnScreen={true} />
    </div>
  </div>
);

const EntitySocialPreview = (props: { rootEntity: string; page: string }) => {
  const cardBackgroundImage = useEntity(
    props.rootEntity,
    "theme/card-background-image",
  );
  const cardBackgroundRepeat = useEntity(
    props.rootEntity,
    "theme/card-background-image-repeat",
  );
  const cardBackgroundOpacity = useEntity(
    props.rootEntity,
    "theme/card-background-image-opacity",
  );

  const wrapperStyle: CSSProperties = {
    backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
    backgroundImage: cardBackgroundImage
      ? `url(${cardBackgroundImage.data.src}), url(${cardBackgroundImage.data.fallback})`
      : undefined,
    backgroundRepeat: cardBackgroundRepeat ? "repeat" : "no-repeat",
    backgroundPosition: "center",
    backgroundSize: !cardBackgroundRepeat
      ? "cover"
      : (cardBackgroundRepeat.data.value as number) / 3,
    opacity:
      cardBackgroundImage?.data.src && cardBackgroundOpacity
        ? cardBackgroundOpacity.data.value
        : 1,
  };

  return (
    <ThemeProvider local entityID={props.rootEntity} className="w-full!">
      <ThemeBackgroundProvider entityID={props.rootEntity}>
        <SocialPreviewFrame page={props.page} wrapperStyle={wrapperStyle} />
      </ThemeBackgroundProvider>
    </ThemeProvider>
  );
};

const PublicationSocialPreview = (props: {
  publication_uri: string;
  record: NormalizedPublication;
  page: string;
}) => {
  const pub_creator = new AtUri(props.publication_uri).host;
  return (
    <PublicationThemeProvider
      theme={props.record.theme}
      pub_creator={pub_creator}
    >
      <PublicationBackgroundProvider
        theme={props.record.theme}
        pub_creator={pub_creator}
      >
        <SocialPreviewFrame
          page={props.page}
          wrapperStyle={{
            backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
          }}
        />
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
};

const BackdateOptions = (props: {
  publishedAt: Date | undefined;
  setPublishedAt: (date: Date | undefined) => void;
}) => {
  const formattedDate = useLocalizedDate(
    props.publishedAt?.toISOString() || "",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    },
  );

  const [timeValue, setTimeValue] = useState<string>(() => {
    const date = props.publishedAt || new Date();
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  });

  let currentTime = `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`;

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    if (!props.publishedAt) return;

    const [hours, minutes] = time.split(":").map((str) => parseInt(str, 10));
    const newDate = setHours(setMinutes(props.publishedAt, minutes), hours);
    const currentDate = new Date();

    if (newDate > currentDate) {
      props.setPublishedAt(currentDate);
      setTimeValue(currentTime);
    } else props.setPublishedAt(newDate);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) {
      props.setPublishedAt(undefined);
      return;
    }
    const [hours, minutes] = timeValue
      .split(":")
      .map((str) => parseInt(str, 10));
    const newDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
    );
    const currentDate = new Date();
    if (newDate > currentDate) {
      props.setPublishedAt(currentDate);
      setTimeValue(currentTime);
    } else props.setPublishedAt(newDate);
  };

  return (
    <div className="flex justify-between gap-2">
      <div className="text-tertiary">Publish Date</div>
      <Popover
        className="w-64 px-2!"
        trigger={
          props.publishedAt ? (
            <div className="text-secondary font-bold hover:underline">
              {formattedDate}
            </div>
          ) : (
            <div className="text-secondary font-bold hover:underline">Now</div>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <DatePicker
            selected={props.publishedAt}
            onSelect={handleDateChange}
            disabled={(date) => date > new Date()}
          />
          <Separator className="border-border" />
          <div className="flex gap-4 pb-1 items-center">
            <TimePicker value={timeValue} onChange={handleTimeChange} />
          </div>
        </div>
      </Popover>
    </div>
  );
};

const PublishingTo = (props: {
  publication_uri?: string;
  record?: NormalizedPublication | null;
}) => {
  if (props.publication_uri && props.record) {
    return (
      <div className="flex  justify-between gap-4">
        <div className="text-tertiary">Publishing to</div>
        <div className="flex gap-2 items-center ">
          <div className="font-bold text-secondary">{props.record.name}</div>
          <PubIcon record={props.record} uri={props.publication_uri} />
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
    <div className="frosted-container p-4 m-3 sm:m-4 flex flex-col gap-1 justify-center text-center w-fit h-fit mx-auto">
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
