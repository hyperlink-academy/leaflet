"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AtUri } from "@atproto/syntax";
import { SpeedyLink } from "components/SpeedyLink";
import { useStandardSitePublication } from "components/StandardSitePublicationDataProvider";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { useIdentityData } from "components/IdentityProvider";
import { useModalBack } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { PubIcon } from "components/ActionBar/Publications";
import { DotLoader } from "components/utils/DotLoader";
import { ShareTiny } from "components/Icons/ShareTiny";
import { CheckTiny } from "components/Icons/CheckTiny";
import { getViewerOwnedPublications } from "actions/publications/recommendPublication";
import type { StandardSitePublicationData } from "app/api/rpc/[command]/get_standard_site_publications";
import { LinkHandle } from "./HandleSubscribe";
import { BLUESKY_SUBSCRIBED_FEED_URL } from "./blueskyFeed";
import { RecommendedPublications } from "./RecommendedPublications";
import { useSubscribeSuccessData } from "./useSubscribeSuccessData";
import {
  RecommendPublicationPicker,
  SharePublicationComposer,
} from "./SubscribeSuccessFollowUps";


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
    <div className="flex flex-col justify-center text-center text-secondary w-full  sm:w-xl pb-2">
      <div className="flex flex-col items-center gap-3 w-full pt-2">
        {publication && <SubscribedPubIcon publication={publication} />}
        <div className="flex flex-col w-full">
          <h3 className="text-primary">You&apos;re Subscribed!</h3>
          {props.children}
        </div>
        {canShare && (
          <ButtonPrimary onClick={() => setView("share")}>
            <ShareTiny /> Share
          </ButtonPrimary>
        )}
      </div>
      <RecommendedPublications
        publicationName={publication?.record.name}
        recommendingPublicationUri={props.publicationUri}
        listings={listings}
      />
      {canRecommend && (
        <div className="text-tertiary text-sm pt-3">
          If your readers would enjoy this publication, consider{" "}
          <button
            type="button"
            className="text-accent-contrast hover:underline"
            onClick={() => setView("recommend")}
          >
            recommending it
          </button>
          !
        </div>
      )}
    </div>
  );
}

const SubscribedPubIcon = (props: {
  publication: StandardSitePublicationData;
}) => {
  let record = props.publication.record;
  let iconSrc = record.icon
    ? blobRefToSrc(record.icon.ref, new AtUri(props.publication.uri).host)
    : undefined;
  return (
    <div className="relative w-fit">
      <PubIcon icon={iconSrc} pubName={record.name} xl />
      <div className="absolute -bottom-1 -right-1 rounded-full p-1.5 bg-accent-1 text-accent-2 border-2 border-bg-page">
        <CheckTiny />
      </div>
    </div>
  );
};

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
