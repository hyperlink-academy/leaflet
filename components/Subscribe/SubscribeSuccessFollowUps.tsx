"use client";

import { useState } from "react";
import { mutate as mutateGlobal } from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { ButtonPrimary } from "components/Buttons";
import { useToaster } from "components/Toast";
import { DotLoader } from "components/utils/DotLoader";
import { PubIcon } from "components/ActionBar/Publications";
import { RecommendEmptyTiny } from "components/Icons/RecommendTiny";
import { CheckboxChecked } from "components/Icons/CheckboxChecked";
import { CheckboxEmpty } from "components/Icons/CheckboxEmpty";
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
import { bskyPostEmbed } from "src/utils/bskyPostEmbed";
import { viewerPostLangs } from "src/utils/bskyPostLangs";
import { CheckTiny } from "components/Icons/CheckTiny";

export function SharePublicationComposer(props: {
  publication: Pick<StandardSitePublicationData, "uri" | "record">;
  onPosted: () => void;
}) {
  let { identity } = useIdentityData();
  let { editorStateRef, charCount, setCharCount, posting, post } =
    useBskyPostSubmit({ onPosted: props.onPosted });
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
        autoFocus
        hideCharacterCounter
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
  let [selected, setSelected] = useState<string[]>([]);
  let [saving, setSaving] = useState(false);
  let name = props.publicationName ?? "this publication";

  let toggle = (uri: string) =>
    setSelected((s) =>
      s.includes(uri) ? s.filter((u) => u !== uri) : [...s, uri],
    );

  let recommend = async () => {
    let pubs = props.publications.filter((p) => selected.includes(p.uri));
    if (!pubs.length || saving) return;
    setSaving(true);
    let succeeded: typeof pubs = [];
    let failure: Parameters<typeof actionErrorContent>[0] | null = null;
    for (let pub of pubs) {
      let res = await addPublicationRecommendation({
        publicationUri: pub.uri,
        recommendation: props.publicationUri,
      });
      if (!res.ok) {
        failure = failure ?? res.error;
        continue;
      }
      succeeded.push(pub);
      // The dashboard settings form reads this key for the same publication.
      mutateGlobal(
        ["publication_recommendations", pub.uri],
        res.value.recommendations,
        { revalidate: false },
      );
    }
    setSaving(false);
    if (succeeded.length)
      toaster({
        type: "success",
        content:
          succeeded.length === 1
            ? `${succeeded[0].name} now recommends ${name}!`
            : `${succeeded.length} of your publications now recommend ${name}!`,
      });
    if (failure) {
      // Leave the ones that didn't go through checked so they can be retried.
      let done = succeeded.map((p) => p.uri);
      setSelected((s) => s.filter((uri) => !done.includes(uri)));
      toaster({
        type: "error",
        content: actionErrorContent(
          failure,
          "Hmm… Something went wrong. Try again!",
        ),
      });
      return;
    }
    props.onRecommended();
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-full  text-left p-2 sm:w-xl">
      <div className="text-center">
        <h3 className="text-primary">Recommend this Publication</h3>
        <p className="text-secondary text-sm">
          Pick which of your publications should recommend {name}.
          Recommendations are shown to readers after they subscribe.
        </p>
      </div>
      <div className="flex flex-col gap-2" role="group">
        {props.publications.map((pub) => {
          let status = pub.recommendations.includes(props.publicationUri)
            ? "Already recommends this publication"
            : null;
          let isSelected = selected.includes(pub.uri);
          return (
            <button
              key={pub.uri}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              disabled={!!status}
              onClick={() => toggle(pub.uri)}
              className={`flex items-start gap-2 p-2 text-left rounded-md block-border hover:outline-border!
                ${isSelected ? "bg-[var(--accent-light)]" : "border-border-light"}
                ${status ? "opacity-60 cursor-not-allowed" : "hover:border-accent-contrast"}`}
            >
              <PubIcon icon={pub.icon ?? undefined} pubName={pub.name} />
              <div className="flex flex-col grow min-w-0 leading-tight">
                <span className="font-bold text-primary truncate pt-0.5">
                  {pub.name}
                </span>
                {status && (
                  <span className="text-xs text-tertiary">{status}</span>
                )}
              </div>
              {isSelected && (
                <CheckTiny className="text-accent-contrast shrink-0  mt-1 mr-1 " />
              )}
            </button>
          );
        })}
      </div>
      <ButtonPrimary
        className="place-self-end"
        onClick={recommend}
        disabled={!selected.length || saving}
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
