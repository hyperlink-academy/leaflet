"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PubListing } from "app/(app)/(identity)/(home-pages)/p/[didOrHandle]/PubListing";
import { SpeedyLink } from "components/SpeedyLink";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { useIdentityData } from "components/IdentityProvider";
import { useModalBack } from "components/Modal";
import { ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { ShareTiny } from "components/Icons/ShareTiny";
import { RecommendEmptyTiny } from "components/Icons/RecommendTiny";
import { getViewerOwnedPublications } from "actions/publications/recommendPublication";
import { LinkHandle } from "./HandleSubscribe";
import { BLUESKY_SUBSCRIBED_FEED_URL } from "./blueskyFeed";
import { RecommendedPublications } from "./RecommendedPublications";
import { useSubscribeSuccessData } from "./useSubscribeSuccessData";
import {
  RecommendPublicationPicker,
  SharePublicationComposer,
} from "./SubscribeSuccessFollowUps";

// Shared frame for the post-subscribe success modals: the heading, a listing for
// the publication just subscribed to (no subscribe button — they're already
// subscribed), the subscription-specific body passed as children, follow-up
// actions (share the publication on Bluesky, recommend it from one of the
// viewer's own publications — each swaps the modal's content in place), and the
// publication's own recommendations.
export function SubscribeSuccess(props: {
  publicationUri: string | undefined;
  children: React.ReactNode;
}) {
  let { loading, publication, listings } = useSubscribeSuccessData(
    props.publicationUri,
  );
  let { identity } = useIdentityData();
  let [view, setView] = useState<"share" | "recommend" | null>(null);
  let back = () => setView(null);
  useModalBack(view ? back : null);

  let viewerDid = identity?.atp_did ?? null;
  let { data: ownedPubs, mutate: mutateOwnedPubs } = useSWR(
    viewerDid ? ["viewer-owned-publications", viewerDid] : null,
    () => getViewerOwnedPublications(),
    { revalidateOnFocus: false },
  );
  // A publication can't recommend itself.
  let candidatePubs = (ownedPubs ?? []).filter(
    (p) => p.uri !== props.publicationUri,
  );

  if (loading)
    return (
      <div className="flex justify-center items-center py-8 text-secondary w-full max-w-full sm:min-w-md">
        <DotLoader />
      </div>
    );

  if (view === "share" && publication)
    return (
      <SharePublicationComposer publication={publication} onPosted={back} />
    );

  if (view === "recommend" && publication)
    return (
      <RecommendPublicationPicker
        publicationUri={publication.uri}
        publicationName={publication.record.name}
        publications={candidatePubs}
        onRecommended={() => {
          mutateOwnedPubs();
          back();
        }}
      />
    );

  let canShare = !!viewerDid && !!publication;
  let canRecommend = canShare && candidatePubs.length > 0;
  return (
    <div className="flex flex-col justify-center text-center pb-3 text-secondary w-full max-w-full sm:w-auto sm:min-w-md sm:max-w-2xl">
      <h3 className="text-primary pb-4 pt-2">You've Subscribed!</h3>
      {publication && (
        <PubListing
          className="p-0!"
          uri={publication.uri}
          record={publication.record}
          authorProfile={
            publication.author?.handle
              ? { handle: `@${publication.author.handle}` }
              : undefined
          }
        />
      )}
      <div className="spacer h-4 w-full" />
      {props.children}
      {canShare && (
        <>
          <hr className="my-4 border-border-light" />
          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
            <ButtonSecondary fullWidthOnMobile onClick={() => setView("share")}>
              <ShareTiny /> Share this publication
            </ButtonSecondary>
            {canRecommend && (
              <ButtonSecondary
                fullWidthOnMobile
                onClick={() => setView("recommend")}
              >
                <RecommendEmptyTiny /> Recommend to your subscribers
              </ButtonSecondary>
            )}
          </div>
        </>
      )}
      <RecommendedPublications
        publicationName={publication?.record.name}
        recommendingPublicationUri={props.publicationUri}
        listings={listings}
      />
    </div>
  );
}

export const AtSubscribeSuccess = (props: { publicationUri?: string }) => {
  let { data: publication } = useStandardSitePublication(props.publicationUri);
  let rssUrl = publication ? `${getPublicationURL(publication)}/rss` : null;
  return (
    <SubscribeSuccess publicationUri={props.publicationUri}>
      You'll receive new posts in the <br />
      <Link className="font-bold" href={"https://leaflet.pub/reader"}>
        Leaflet Reader
      </Link>
      <span className="text-tertiary text-sm">
        or any standard.site enabled reader!
      </span>
      <hr className="my-4 border-border-light" />
      <div className="flex flex-col">
        <h4>Other ways to follow</h4>
        {rssUrl && (
          <a href={rssUrl} target="_blank" rel="noopener noreferrer">
            Get the RSS Feed
          </a>
        )}
        <a
          href={BLUESKY_SUBSCRIBED_FEED_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Pin Custom Feed in Bluesky
        </a>
      </div>
    </SubscribeSuccess>
  );
};

export const EmailSubscribeSuccess = (props: {
  email: string | undefined;
  handle: string | undefined;
  publicationUri?: string;
}) => {
  return (
    <SubscribeSuccess publicationUri={props.publicationUri}>
      <div>
        You'll receive new posts to{" "}
        <em>{props.email ? props.email : "your email"}</em>
      </div>
      <div>
        and in the{" "}
        <SpeedyLink href={"https://leaflet.pub/reader"}>
          Leaflet Reader
        </SpeedyLink>
      </div>
      {!props.handle && (
        <>
          <hr className="my-4 border-border-light" />
          <div className="accent-container p-3">
            <LinkHandle compact />
          </div>
        </>
      )}
    </SubscribeSuccess>
  );
};
