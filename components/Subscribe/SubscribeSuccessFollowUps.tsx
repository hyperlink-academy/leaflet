"use client";

import { useState } from "react";
import { mutate as mutateGlobal } from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { ButtonPrimary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { PubIcon } from "components/ActionBar/Publications";
import { RecommendEmptyTiny } from "components/Icons/RecommendTiny";
import { CheckTiny } from "components/Icons/CheckTiny";
import { actionErrorContent } from "components/OAuthError";
import type { StandardSitePublicationData } from "app/api/rpc/[command]/get_standard_site_publications";
import {
  BskyPostSubmitButton,
  LazyBlueskyPostComposer,
  useBskyPostSubmit,
} from "components/BlueskyPostComposer/BskyPostSubmit";
import { usePrefetchedScreenshot } from "components/BlueskyPostComposer/usePrefetchedScreenshot";
import { publishPublicationShareToBsky } from "actions/publishBskyPost";
import {
  addPublicationRecommendation,
  type ViewerOwnedPublication,
} from "actions/publications/recommendPublication";
import { MAX_RECOMMENDATIONS } from "src/utils/publicationRecommendations";
import { bskyPostEmbed } from "src/utils/bskyPostEmbed";
import { viewerPostLangs } from "src/utils/bskyPostLangs";

export function SharePublicationComposer(props: {
  publication: StandardSitePublicationData;
  onPosted: () => void;
}) {
  let { identity } = useIdentityData();
  let { editorStateRef, charCount, setCharCount, posting, post } =
    useBskyPostSubmit({ onPosted: props.onPosted });

  // The record's url is the publication's canonical public address (custom
  // domain included), which is what a shared post should point at even when
  // the viewer subscribed from a dev host or a mirrored page.
  let url = props.publication.record.url;
  let screenshot = usePrefetchedScreenshot(url, true);

  let share = () =>
    post(async (text, facets) =>
      publishPublicationShareToBsky({
        text,
        facets,
        url,
        publicationUri: props.publication.uri,
        prefetchedThumb: (await screenshot.promiseRef.current) ?? undefined,
        langs: viewerPostLangs(),
      }),
    );

  return (
    <div className="flex flex-col gap-3 w-full max-w-full sm:w-lg text-left">
      <h3 className="text-primary text-center">Share on Bluesky</h3>
      <LazyBlueskyPostComposer
        profile={{
          avatar: identity?.bsky_profiles?.record.avatar,
          displayName: identity?.bsky_profiles?.record.displayName,
          handle: identity?.bsky_profiles?.record.handle,
        }}
        editorStateRef={editorStateRef}
        charCount={charCount}
        onCharCountChange={setCharCount}
        embed={bskyPostEmbed({
          url,
          title: props.publication.record.name,
          description: props.publication.record.description,
          thumb: screenshot.previewSrc ?? undefined,
          thumbPending: !screenshot.previewSrc,
          pubOwnerDid: undefined,
        })}
      />
      <BskyPostSubmitButton
        posting={posting}
        charCount={charCount}
        onClick={share}
      />
    </div>
  );
}

export function RecommendPublicationPicker(props: {
  publicationUri: string;
  publicationName: string | undefined;
  publications: ViewerOwnedPublication[];
  onRecommended: () => void;
}) {
  let toaster = useToaster();
  let [selected, setSelected] = useState<string | null>(null);
  let [saving, setSaving] = useState(false);
  let name = props.publicationName ?? "this publication";

  let recommend = async () => {
    let pub = props.publications.find((p) => p.uri === selected);
    if (!pub || saving) return;
    setSaving(true);
    let res = await addPublicationRecommendation({
      publicationUri: pub.uri,
      recommendation: props.publicationUri,
    });
    setSaving(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content: actionErrorContent(
          res.error,
          "Hmm… Something went wrong. Try again!",
        ),
      });
      return;
    }
    // The dashboard settings form reads this key for the same publication.
    mutateGlobal(
      ["publication_recommendations", pub.uri],
      res.value.recommendations,
      { revalidate: false },
    );
    toaster({
      type: "success",
      content: `${pub.name} now recommends ${name}!`,
    });
    props.onRecommended();
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-full sm:w-md text-left">
      <div className="text-center">
        <h3 className="text-primary">Recommend to your subscribers</h3>
        <p className="text-secondary text-sm">
          Pick which of your publications should recommend {name}.
          Recommendations are shown to readers after they subscribe.
        </p>
      </div>
      <div className="flex flex-col gap-2" role="radiogroup">
        {props.publications.map((pub) => {
          let status = pub.recommendations.includes(props.publicationUri)
            ? "Already recommends this publication"
            : pub.recommendations.length >= MAX_RECOMMENDATIONS
              ? `Already recommends ${MAX_RECOMMENDATIONS} publications`
              : null;
          let isSelected = selected === pub.uri;
          return (
            <button
              key={pub.uri}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!!status}
              onClick={() => setSelected(pub.uri)}
              className={`flex items-center gap-3 p-2 text-left rounded-md border
                ${isSelected ? "border-accent-contrast bg-bg-page" : "border-border-light"}
                ${status ? "opacity-60 cursor-not-allowed" : "hover:border-accent-contrast"}`}
            >
              <PubIcon icon={pub.icon ?? undefined} pubName={pub.name} />
              <div className="flex flex-col grow min-w-0 leading-tight">
                <span className="font-bold text-primary truncate">
                  {pub.name}
                </span>
                <span className="text-xs text-tertiary">
                  {status ??
                    `${pub.recommendations.length}/${MAX_RECOMMENDATIONS} recommendations used`}
                </span>
              </div>
              {isSelected && (
                <CheckTiny className="text-accent-contrast shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <ButtonPrimary
        className="place-self-end"
        compact
        onClick={recommend}
        disabled={!selected || saving}
      >
        {saving ? (
          <DotLoader />
        ) : (
          <>
            <RecommendEmptyTiny /> Recommend
          </>
        )}
      </ButtonPrimary>
    </div>
  );
}
