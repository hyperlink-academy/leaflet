"use client";
import { Checkbox } from "components/Checkbox";
import { BlueskyPostComposer } from "components/BlueskyPostComposer/BlueskyPostComposer";
import { EditorState } from "prosemirror-state";
import { AppBskyFeedDefs, AtUri } from "@atproto/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { useState } from "react";
import { sendPostPreview } from "actions/publications/sendPostPreview";
import { ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";

export type ShareState = {
  bluesky: boolean;
  postToReaders: boolean;
  email: boolean;
  quiet: boolean;
};

type Props = {
  shareState: ShareState;
  setShareState: (state: ShareState) => void;
  charCount: number;
  setCharCount: (c: number) => void;
  editorStateRef: React.MutableRefObject<EditorState | null>;
  title: string;
  profile: ProfileViewDetailed;
  publicationProfile?: ProfileViewDetailed;
  description: string;
  record?: NormalizedPublication | null;
  subscriberCount?: number;
  newsletter_enabled?: boolean;
  publication_uri?: string;
  root_entity: string;
  leaflet_id: string;
  // ISO publish date (scheduled, or undefined for immediate) — previewed in the
  // standard.site card footer.
  publishedAt?: string;
  // localStorage key under which the in-progress Bluesky post is persisted
  bskyDraftKey?: string;
};

export function ShareOptions(props: Props) {
  const { shareState, setShareState } = props;
  // When publishing to a publication, the Bluesky post lives in the
  // publication owner's PDS, so the preview should show their identity.
  const previewProfile = props.publicationProfile ?? props.profile;

  // When publishing to a publication, mirror the standard.site enrichment that
  // bluesky's appview derives from the post's associatedRefs, so the compose
  // card previews the same publication footer (icon, name, author, date) the
  // published post will show. See BskyEmbed's StandardSiteExternalEmbed.
  const pubDid = props.publication_uri
    ? new AtUri(props.publication_uri).host
    : previewProfile.did;
  const bskyEmbed = {
    $type: "app.bsky.embed.external#view",
    external: {
      uri: props.record?.url ?? "",
      title: props.title,
      description: props.description,
      ...(props.record && {
        createdAt: props.publishedAt ?? new Date().toISOString(),
        source: {
          uri: props.record.url,
          title: props.record.name,
          icon: props.record.icon
            ? blobRefToSrc(props.record.icon.ref, pubDid)
            : undefined,
        },
        associatedRefs: [
          { uri: `at://${pubDid}/site.standard.document/preview` },
          { uri: `at://${pubDid}/site.standard.publication/preview` },
        ],
        associatedProfiles: [
          {
            did: pubDid,
            handle: previewProfile.handle,
            displayName: previewProfile.displayName,
            avatar: previewProfile.avatar,
          },
        ],
      }),
    },
  } as AppBskyFeedDefs.PostView["embed"];
  const handleChange = (
    key: keyof Omit<ShareState, "quiet">,
    checked: boolean,
  ) => {
    setShareState({ ...shareState, [key]: checked, quiet: false });
  };

  const handleQuietChange = (checked: boolean) => {
    if (checked) {
      setShareState({
        bluesky: false,
        postToReaders: false,
        email: false,
        quiet: true,
      });
    } else {
      setShareState({ ...shareState, quiet: false });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {props.newsletter_enabled ? (
        <>
          <Checkbox
            className="gap-4!"
            checked={shareState.email}
            onChange={(e) => handleChange("email", e.target.checked)}
          >
            <div className="flex flex-col">
              <div>
                Email{" "}
                {props.subscriberCount !== undefined
                  ? `${props.subscriberCount.toLocaleString()} `
                  : ""}
                {props.subscriberCount === 1 ? "Subscriber" : "Subscribers"}
              </div>
            </div>
          </Checkbox>
          {props.publication_uri ? (
            <EmailPreview
              publication_uri={props.publication_uri}
              root_entity={props.root_entity}
              leaflet_id={props.leaflet_id}
              title={props.title}
              description={props.description}
            />
          ) : null}
        </>
      ) : null}

      <Checkbox
        className="gap-4!"
        checked={shareState.postToReaders}
        onChange={(e) => handleChange("postToReaders", e.target.checked)}
      >
        <div className="flex flex-col">
          <div>Show in Discover</div>
          <div className="text-sm text-tertiary font-normal">
            Show this post in Leaflet's Discover feed and other standard.site
            reader feeds
          </div>
        </div>
      </Checkbox>

      <Checkbox
        className="gap-4!"
        checked={shareState.bluesky}
        onChange={(e) => handleChange("bluesky", e.target.checked)}
      >
        <div className="flex flex-col">
          <div>Share on Bluesky</div>
          <div className="text-sm text-tertiary font-normal">
            Subscribers will be updated via a custom Bluesky feed
          </div>
        </div>
      </Checkbox>
      <div
        className={`w-full opaque-container rounded-lg! p-3 ml-7 pb-2 ${!shareState.bluesky ? "opacity-50" : ""}`}
      >
        <BlueskyPostComposer
          profile={{
            avatar: previewProfile.avatar,
            displayName: previewProfile.displayName,
            handle: previewProfile.handle,
          }}
          editorStateRef={props.editorStateRef}
          charCount={props.charCount}
          onCharCountChange={props.setCharCount}
          persistKey={props.bskyDraftKey}
          embed={bskyEmbed}
        />
      </div>

      <hr className="border-border-light my-1" />

      <Checkbox
        className="gap-4!"
        checked={shareState.quiet}
        onChange={(e) => handleQuietChange(e.target.checked)}
      >
        <div className="flex flex-col">
          <div>Post Quietly</div>
          <div className="text-sm text-tertiary font-normal">
            No one will be notified about this post
          </div>
        </div>
      </Checkbox>
    </div>
  );
}

function EmailPreview(props: {
  publication_uri: string;
  root_entity: string;
  leaflet_id: string;
  title: string;
  description: string;
}) {
  let [email, setEmail] = useState("");
  let [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "sending" }
    | { state: "sent" }
    | { state: "error"; message: string }
  >({ state: "idle" });

  const errorCopy = (code: string) => {
    switch (code) {
      case "unauthorized":
        return "You don't have permission to send a preview for this publication.";
      case "invalid_email":
        return "That email address doesn't look right.";
      case "newsletter_not_enabled":
        return "Newsletter mode isn't enabled for this publication.";
      case "no_from_address":
        return "This publication doesn't have a leaflet.pub subdomain to send from.";
      case "render_failed":
        return "Couldn't render the email. Try again?";
      case "email_send_failed":
        return "Postmark rejected the send. Try again later.";
      default:
        return "Something went wrong sending the preview.";
    }
  };

  const submit = async () => {
    if (!email) return;
    setStatus({ state: "sending" });
    const res = await sendPostPreview({
      publication_uri: props.publication_uri,
      root_entity: props.root_entity,
      leaflet_id: props.leaflet_id,
      title: props.title,
      description: props.description,
      to: email,
    });
    if (res.ok) {
      setStatus({ state: "sent" });
    } else {
      setStatus({ state: "error", message: errorCopy(res.error) });
    }
  };

  return (
    <div className="pl-7 pb-2 flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status.state !== "idle") setStatus({ state: "idle" });
          }}
          className="grow input-with-border px-2 py-1 text-sm rounded-md"
        />
        <ButtonSecondary
          type="button"
          onClick={submit}
          disabled={!email || status.state === "sending"}
          className="h-[30px]"
        >
          {status.state === "sending" ? (
            <DotLoader className="h-[23px]" />
          ) : (
            "Send preview"
          )}
        </ButtonSecondary>
      </div>
      {status.state === "sent" ? (
        <div className="text-sm text-tertiary italic">
          Preview sent to {email}.
        </div>
      ) : status.state === "error" ? (
        <div className="text-sm text-accent-contrast">{status.message}</div>
      ) : (
        <div className="text-sm text-tertiary font-normal">
          Send the rendered email to a test address before broadcasting.
        </div>
      )}
    </div>
  );
}
