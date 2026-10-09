"use client";
import { publishToPublication } from "actions/publishToPublication";
import { DotLoader } from "components/utils/DotLoader";
import { useState, useRef, useCallback, type CSSProperties } from "react";
import { useLocalStorageState } from "src/hooks/useLocalStorageState";
import { clearDraftDoc } from "src/utils/prosemirror/draftPersistence";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useParams } from "next/navigation";
import Link from "next/link";

import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { publishPostToBsky } from "actions/publishBskyPost";
import { viewerPostLangs } from "src/utils/bskyPostLangs";
import { ShareOptions, type ShareState } from "./ShareOptions";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { AtUri } from "@atproto/syntax";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { PublishIllustration } from "./PublishIllustration/PublishIllustration";
import { useEntity, useReplicache } from "src/replicache";
import { addPostHeaderBlock } from "src/utils/addPostHeaderBlock";
import { uploadCoverImage } from "src/utils/uploadCoverImage";
import { useSubscribe } from "src/replicache/useSubscribe";
import { editorStateToFacetedText } from "components/BlueskyPostComposer/ProsemirrorEditor";
import { EditorState } from "prosemirror-state";
import { TagSelector } from "components/Tags";
import { latestSendAt } from "src/emailPosts/types";
import { PublishingTo } from "./PublishingTo";
import {
  cancelScheduledPost,
  saveScheduledPost,
} from "actions/publications/scheduledPosts";
import type { SaveScheduledPostError } from "src/scheduledPosts/save";
import type { ScheduledPostIneligibleReason } from "src/scheduledPosts/eligibility";
import {
  isScheduledPostPublishing,
  scheduledPostProblem,
  type ScheduledPost,
} from "src/scheduledPosts/types";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";
import { DatePicker, TimePicker } from "components/DatePicker";
import { Popover } from "components/Popover";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { Separator } from "react-aria-components";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { LeafletContent } from "app/(app)/(identity)/(home-pages)/(writer)/home/LeafletList/LeafletContent";
import { Contributor } from "lexicons/api/types/site/standard/document";
import {
  BskyEmbed,
  StandardSiteExternalEmbed,
} from "components/Blocks/BlueskyPostBlock/BskyEmbed";

type Props = {
  title: string;
  leaflet_id: string;
  root_entity: string;
  viewerProfile: ProfileViewDetailed;
  publicationOwnerProfile?: ProfileViewDetailed;
  publicationOwnerDid?: string;
  description: string;
  publication_uri?: string;
  pubRecord?: NormalizedPublication | null;
  posts_in_pub?: number;
  newsletter_enabled?: boolean;
  subscriberCount?: number;
  entitiesToDelete?: string[];
  hasDraft: boolean;
  // Set when this draft can be scheduled to publish later, or already is.
  scheduling?: {
    existing: ScheduledPost | null;
    ineligibleReason: ScheduledPostIneligibleReason | null;
  };
};

type PublishState =
  | { state: "default" }
  | { state: "success"; post_url: string }
  | { state: "scheduled"; scheduled: ScheduledPost };

const scheduleErrorCopy: Record<SaveScheduledPostError, string> = {
  unauthorized: "You don't have permission to publish to this publication.",
  not_pro: "Scheduling posts is a Leaflet Pro feature.",
  already_published: "This post has already been published.",
  is_email_post: "This draft is an email, it can't be scheduled to publish.",
  invalid_publish_at: "Pick a time in the next year to publish this post.",
  publishing: "This post is already being published.",
  database_error:
    "Something went wrong scheduling this post. Please try again!",
};

export function PublishPost(props: Props) {
  let [publishState, setPublishState] = useState<PublishState>({
    state: "default",
  });
  return (
    <div className="publishPage w-screen min-h-screen bg-bg-page flex justify-center text-primary">
      {publishState.state === "default" ? (
        <PublishPostForm setPublishState={setPublishState} {...props} />
      ) : publishState.state === "scheduled" ? (
        <ScheduledPostSuccess
          scheduled={publishState.scheduled}
          publication_uri={props.publication_uri}
          record={props.pubRecord}
        />
      ) : (
        <PublishPostSuccess
          record={props.pubRecord}
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
    setPublishState: (s: PublishState) => void;
  } & Props,
) => {
  let editorStateRef = useRef<EditorState | null>(null);
  // All publish-flow drafts (toggles, tags, backdate, the Bluesky post) are
  // scoped to this document + destination so each publish keeps its own state
  let publishKey = `publish:v1:${props.publication_uri ?? "looseleaf"}:${props.root_entity}`;
  let bskyDraftKey = `${publishKey}:bsky`;
  let [state, setState] = useState<"post-details" | "share-options">(
    "post-details",
  );
  let [charCount, setCharCount] = useState(0);
  let [scheduled, setScheduled] = useState(props.scheduling?.existing ?? null);
  let canSchedule = !!props.scheduling && !props.scheduling.ineligibleReason;
  // A scheduled post reopens with what it was scheduled with.
  let [shareState, setShareState, clearShareState] =
    useLocalStorageState<ShareState>(
      `${publishKey}:share`,
      scheduled
        ? {
            bluesky: !!scheduled.bsky_post,
            postToReaders: scheduled.show_in_discover,
            email: scheduled.send_email,
            quiet:
              !scheduled.bsky_post &&
              !scheduled.show_in_discover &&
              !scheduled.send_email,
          }
        : { bluesky: true, postToReaders: true, email: true, quiet: false },
    );
  let [isLoading, setIsLoading] = useState(false);
  const nothingSelected =
    !shareState.bluesky &&
    !shareState.postToReaders &&
    !shareState.email &&
    !shareState.quiet;
  let [oauthError, setOauthError] = useState<
    import("src/atproto-oauth").OAuthSessionError | null
  >(null);
  let [publishError, setPublishError] = useState<string | null>(null);
  let params = useParams();
  let { rep, permission_token } = useReplicache();
  let firstPage = useEntity(props.root_entity, "root/page")[0]?.data.value;

  // Title and description come from Replicache, the same source the editor's
  // Update button uses. The server props were captured when this page rendered,
  // and the router cache can serve that payload across an edit — publishing
  // from it would write a title the author already changed.
  let replicacheTitle = useSubscribe(rep, (tx) =>
    tx.get<string>("publication_title"),
  );
  let replicacheDescription = useSubscribe(rep, (tx) =>
    tx.get<string>("publication_description"),
  );
  let title =
    typeof replicacheTitle === "string" ? replicacheTitle : props.title;
  let description =
    typeof replicacheDescription === "string"
      ? replicacheDescription
      : props.description;

  // For publications with drafts, use Replicache; otherwise use local state
  let replicacheTags = useSubscribe(rep, (tx) =>
    tx.get<string[]>("publication_tags"),
  );
  let [localTags, setLocalTags, clearLocalTags] = useLocalStorageState<
    string[]
  >(`${publishKey}:tags`, []);
  let [showTagSelector, setShowTagSelector, clearShowTagSelector] =
    useLocalStorageState<boolean>(`${publishKey}:showTags`, false);

  // Stored as an ISO string (Date isn't JSON-serializable); undefined ⇒ "Now"
  let [publishedAtISO, setPublishedAtISO, clearPublishedAt] =
    useLocalStorageState<string | null>(
      `${publishKey}:publishedAt`,
      scheduled?.publish_at ?? null,
    );
  let localPublishedAt = publishedAtISO ? new Date(publishedAtISO) : undefined;
  let setLocalPublishedAt = useCallback(
    (date: Date | undefined) =>
      setPublishedAtISO(date ? date.toISOString() : null),
    [setPublishedAtISO],
  );
  // A publish date in the future schedules the post rather than publishing it.
  let scheduleFor =
    canSchedule && localPublishedAt && localPublishedAt.getTime() > Date.now()
      ? localPublishedAt
      : undefined;
  // The cover image lives on the document root as a root/cover-image reference,
  // set from the draft editor.
  let coverImageEntity =
    useEntity(props.root_entity, "root/cover-image")?.data.value ?? null;
  let coverImageSrc = useEntity(coverImageEntity, "block/image")?.data.src;
  // The did that owns the publication record — needed to resolve the pub icon
  // blob and to attribute the post's author in the social-preview embed.
  let pubDid =
    props.publicationOwnerDid ??
    (props.publication_uri ? new AtUri(props.publication_uri).host : undefined);

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
    setPublishError(null);
    let result: Awaited<ReturnType<typeof publishToPublication>>;
    try {
      // Publishing a loose canvas into a publication moves it there, so it
      // gets the header block a canvas draft is created with.
      let permission_set =
        permission_token.permission_token_rights[0]?.entity_set;
      if (
        rep &&
        !props.hasDraft &&
        props.publication_uri &&
        firstPage &&
        permission_set
      )
        await addPostHeaderBlock(rep, { page: firstPage, permission_set });
      await rep?.push();
      if (scheduleFor && scheduleFor > new Date() && props.publication_uri) {
        let quiet = shareState.quiet;
        let [text, facets] = editorStateRef.current
          ? editorStateToFacetedText(editorStateRef.current)
          : [];
        let saved = await saveScheduledPost({
          publication_uri: props.publication_uri,
          leaflet_id: props.leaflet_id,
          publish_at: scheduleFor.toISOString(),
          send_email: shareState.email && !quiet,
          show_in_discover: shareState.postToReaders && !quiet,
          bsky_post:
            shareState.bluesky && !quiet
              ? {
                  text: text || "",
                  facets: facets || [],
                  langs: viewerPostLangs(),
                }
              : null,
          title,
          description,
          tags: currentTags,
          entitiesToDelete: props.entitiesToDelete ?? [],
        });
        setIsLoading(false);
        if (saved.ok)
          props.setPublishState({ state: "scheduled", scheduled: saved.value });
        else setPublishError(scheduleErrorCopy[saved.error]);
        return;
      }
      result = await publishToPublication({
        root_entity: props.root_entity,
        publication_uri: props.publication_uri,
        leaflet_id: props.leaflet_id,
        title,
        description,
        tags: currentTags,
        entitiesToDelete: props.entitiesToDelete,
        publishedAt:
          localPublishedAt?.toISOString() || new Date().toISOString(),
        postPreferences,
        // Posting quietly forces every share channel off, mirroring the UI where
        // checking "Post Quietly" unchecks all the other options.
        sendEmail: shareState.email && !shareState.quiet,
        showInDiscover: shareState.postToReaders && !shareState.quiet,
      });
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setPublishError(
        "Something went wrong while publishing. Please try again!",
      );
      return;
    }

    if (!result.success) {
      setIsLoading(false);
      if (isOAuthSessionError(result.error)) {
        setOauthError(result.error);
      } else {
        setPublishError(result.error.message);
      }
      return;
    }

    // Generate post URL based on whether it's in a publication or standalone
    let post_url = props.pubRecord?.url
      ? `${props.pubRecord.url}/${result.rkey}`
      : `https://leaflet.pub/p/${props.viewerProfile.did}/${result.rkey}`;

    let [text, facets] = editorStateRef.current
      ? editorStateToFacetedText(editorStateRef.current)
      : [];
    if (shareState.bluesky && !shareState.quiet) {
      let bskyResult = await publishPostToBsky({
        facets: facets || [],
        text: text || "",
        url: post_url,
        document_record: result.record,
        rkey: result.rkey,
        // For publications the post must be authored by the owner's PDS (where
        // the record lives); standalone publishes leave this undefined.
        ownerDid: props.publication_uri ? props.publicationOwnerDid : undefined,
        langs: viewerPostLangs(),
      });
      if (!bskyResult.success && isOAuthSessionError(bskyResult.error)) {
        setIsLoading(false);
        setOauthError(bskyResult.error);
        return;
      }
    }
    setIsLoading(false);
    // The post is out; drop the persisted publish draft so a later visit to
    // this page starts clean rather than restoring stale toggles/text
    clearShareState();
    clearLocalTags();
    clearShowTagSelector();
    clearPublishedAt();
    clearDraftDoc(bskyDraftKey);
    props.setPublishState({ state: "success", post_url });
  }

  return (
    <div className="flex flex-col gap-4 w-[640px] max-w-full sm:px-4 px-3 sm:py-8 py-4 text-primary">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="frosted-container flex flex-col gap-3 sm:p-3 p-4">
          {scheduled && (
            <ScheduledPostNotice
              scheduled={scheduled}
              onCanceled={() => {
                setScheduled(null);
                setLocalPublishedAt(undefined);
              }}
            />
          )}
          {state === "post-details" ? (
            <>
              <h2>Publish: Post Details</h2>
              <PublishingTo
                publication_uri={props.publication_uri}
                record={props.pubRecord}
              />
              <hr className="border-border-light" />

              <BackdateOptions
                publishedAt={localPublishedAt}
                setPublishedAt={setLocalPublishedAt}
                canSchedule={canSchedule}
                showScheduleUpsell={
                  props.scheduling?.ineligibleReason === "not_pro"
                }
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
                      Add Tags
                    </button>
                  )}
                </div>
              </div>
              <hr className="border-border-light" />
              <div className="flex justify-between sm:flex-row flex-col gap-4">
                <div className="text-tertiary shrink-0">Social Preview</div>
                <div className="flex flex-col gap-1.5 w-full sm:max-w-sm">
                  <StandardSiteExternalEmbed
                    external={{
                      uri: props.pubRecord?.url ?? "",
                      title: title || "Untitled",
                      description: description,
                      thumb: coverImageSrc || undefined,
                      source: {
                        uri: props.pubRecord?.url,
                        title: props.pubRecord?.name,
                        icon:
                          props.pubRecord?.icon && pubDid
                            ? blobRefToSrc(props.pubRecord.icon.ref, pubDid)
                            : undefined,
                      },

                      associatedRefs: pubDid
                        ? [
                            {
                              uri: `at://${pubDid}/site.standard.document/preview`,
                            },
                          ]
                        : undefined,
                      createdAt: (localPublishedAt ?? new Date()).toISOString(),
                    }}
                  />

                  <CoverImageControls
                    rootEntity={props.root_entity}
                    coverImageEntity={coverImageEntity}
                  />
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
                title={title}
                viewerProfile={props.viewerProfile}
                publicationOwnerProfile={props.publicationOwnerProfile}
                description={description}
                pubRecord={props.pubRecord}
                newsletter_enabled={props.newsletter_enabled}
                subscriberCount={props.subscriberCount}
                publication_uri={props.publication_uri}
                root_entity={props.root_entity}
                leaflet_id={props.leaflet_id}
                publishedAt={localPublishedAt?.toISOString()}
                bskyDraftKey={bskyDraftKey}
                bskyInitialContent={scheduled?.bsky_post?.text}
                coverImageSrc={coverImageSrc}
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
                    disabled={charCount > 300 || nothingSelected || isLoading}
                  >
                    {isLoading ? (
                      <DotLoader className="h-[23px]" />
                    ) : !scheduleFor ? (
                      "Publish this Post!"
                    ) : scheduled ? (
                      "Update Schedule"
                    ) : (
                      "Schedule this Post!"
                    )}
                  </ButtonPrimary>
                </div>
                {oauthError && (
                  <OAuthErrorMessage
                    error={oauthError}
                    className="text-right text-sm text-accent-contrast"
                  />
                )}
                {publishError && (
                  <div className="text-right text-sm text-accent-contrast leading-snug">
                    {publishError}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

const CoverImageControls = (props: {
  rootEntity: string;
  coverImageEntity: string | null;
}) => {
  let { rep, permission_token } = useReplicache();
  let permission_set = permission_token.permission_token_rights[0]?.entity_set;

  const handleFile = async (file: File) => {
    if (!rep || !permission_set) return;
    await uploadCoverImage(rep, file, {
      rootEntity: props.rootEntity,
      permission_set,
      existingCoverEntity: props.coverImageEntity,
    });
  };

  if (!permission_set) return null;

  return (
    <div className="flex gap-3 justify-end items-center text-border text-sm">
      {props.coverImageEntity && (
        <>
          <button
            type="button"
            className="hover:underline text-accent-contrast"
            onClick={() => {
              if (props.coverImageEntity)
                rep?.mutate.deleteEntity({ entity: props.coverImageEntity });
            }}
          >
            Remove
          </button>
          |
        </>
      )}
      <label
        className="hover:underline hover:cursor-pointer text-accent-contrast"
        onMouseDown={(e) => e.preventDefault()}
      >
        {props.coverImageEntity ? "Change" : "Add"} Cover
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
    </div>
  );
};

const timeOfDay = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

const BackdateOptions = (props: {
  publishedAt: Date | undefined;
  setPublishedAt: (date: Date | undefined) => void;
  // Whether a date in the future can be picked, which schedules the post.
  canSchedule: boolean;
  showScheduleUpsell: boolean;
}) => {
  const formattedDate = usePublishTimeLabel(
    props.publishedAt?.toISOString() || "",
  );

  const [timeValue, setTimeValue] = useState<string>(() =>
    timeOfDay(props.publishedAt || new Date()),
  );

  const latest = () => (props.canSchedule ? latestSendAt() : new Date());

  const setPublishedAt = (date: Date) => {
    const limit = latest();
    if (date > limit) {
      props.setPublishedAt(limit);
      setTimeValue(timeOfDay(limit));
    } else props.setPublishedAt(date);
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    const [hours, minutes] = time.split(":").map((str) => parseInt(str, 10));
    if (isNaN(hours) || isNaN(minutes)) return;
    const day = props.publishedAt ?? new Date();
    setPublishedAt(
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hours,
        minutes,
      ),
    );
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) {
      props.setPublishedAt(undefined);
      return;
    }
    const [hours, minutes] = timeValue
      .split(":")
      .map((str) => parseInt(str, 10));
    setPublishedAt(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
      ),
    );
  };

  const scheduling =
    props.canSchedule &&
    !!props.publishedAt &&
    props.publishedAt.getTime() > Date.now();

  return (
    <div className="flex flex-col gap-1">
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
              <div className="text-secondary font-bold hover:underline">
                Now
              </div>
            )
          }
        >
          <div className="flex flex-col gap-3">
            <DatePicker
              selected={props.publishedAt}
              defaultMonth={props.publishedAt}
              onSelect={handleDateChange}
              disabled={(date) => date > latest()}
            />
            <Separator className="border-border" />
            <div className="flex gap-4 pb-1 items-center">
              <TimePicker value={timeValue} onChange={handleTimeChange} />
              {props.publishedAt && (
                <button
                  type="button"
                  className="font-bold text-accent-contrast shrink-0"
                  onClick={() => {
                    props.setPublishedAt(undefined);
                    setTimeValue(timeOfDay(new Date()));
                  }}
                >
                  Reset to Now
                </button>
              )}
            </div>
            {props.showScheduleUpsell && (
              <p className="text-sm text-tertiary pb-1">
                Want to publish this later? Scheduling posts is a{" "}
                <Link href="/upgrade">Leaflet Pro</Link> feature.
              </p>
            )}
          </div>
        </Popover>
      </div>
      {scheduling && (
        <p className="text-sm text-tertiary text-right">
          This post will be published then, with any edits made in the meantime.
        </p>
      )}
    </div>
  );
};

// Node and browsers format clock times with different invisible whitespace,
// so the server renders the date alone and the time joins after hydration.
function usePublishTimeLabel(iso: string) {
  let loaded = useHasPageLoaded();
  return useLocalizedDate(iso, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(loaded ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

const ScheduledPostNotice = (props: {
  scheduled: ScheduledPost;
  onCanceled: () => void;
}) => {
  let { scheduled } = props;
  let publishAt = usePublishTimeLabel(scheduled.publish_at);
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState<string | null>(null);
  let problem = scheduledPostProblem(scheduled);
  let publishing = isScheduledPostPublishing(scheduled, Date.now());
  return (
    <div className="accent-container px-3 py-2 text-sm text-secondary flex justify-between items-start gap-3">
      <div>
        {error ??
          (problem
            ? `${problem} Pick a new time, or publish it now.`
            : publishing
              ? "This post is being published now."
              : `This post is scheduled to publish ${publishAt}.`)}
      </div>
      {!publishing && (
        <button
          type="button"
          className="font-bold text-accent-contrast shrink-0"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            let result = await cancelScheduledPost(scheduled.leaflet);
            setLoading(false);
            if (result.ok) props.onCanceled();
            else
              setError(
                result.error === "publishing"
                  ? "This post is already being published."
                  : "Couldn't unschedule this post.",
              );
          }}
        >
          {loading ? <DotLoader /> : "Unschedule"}
        </button>
      )}
    </div>
  );
};

const PublishPostSuccess = (props: {
  post_url: string;
  publication_uri?: string;
  record: Props["pubRecord"];
  posts_in_pub: number;
}) => {
  let uri = props.publication_uri ? new AtUri(props.publication_uri) : null;
  return (
    <div className="frosted-container p-4 m-3 sm:m-4 flex flex-col gap-1 justify-center text-center w-fit h-fit mx-auto place-self-center">
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

const ScheduledPostSuccess = (props: {
  scheduled: ScheduledPost;
  publication_uri?: string;
  record: Props["pubRecord"];
}) => {
  let uri = props.publication_uri ? new AtUri(props.publication_uri) : null;
  let publishAt = usePublishTimeLabel(props.scheduled.publish_at);
  return (
    <div className="frosted-container p-4 m-3 sm:m-4 flex flex-col gap-1 justify-center text-center w-fit h-fit mx-auto place-self-center">
      <h2 className="pt-2">Post scheduled!</h2>
      <p className="text-secondary">It will be published {publishAt}.</p>
      {uri && props.record && (
        <Link
          className="hover:no-underline! font-bold place-self-center pt-2"
          href={`/lish/${uri.host}/${encodeURIComponent(props.record.name || "")}/dashboard`}
        >
          <ButtonPrimary>Back to Dashboard</ButtonPrimary>
        </Link>
      )}
      <Link href={`/${props.scheduled.leaflet}`}>Back to the post</Link>
    </div>
  );
};
