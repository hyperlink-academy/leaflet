"use client";
import { useState } from "react";
import { SWRConfig, unstable_serialize } from "swr";
import { IdentityContext, type Identity } from "components/IdentityProvider";
import {
  AtSubscribeSuccess,
  EmailSubscribeSuccess,
} from "components/Subscribe/SubscribeSuccess";
import type { PublicationSubscription } from "actions/reader/getSubscriptions";
import type { StandardSitePublicationData } from "app/api/rpc/[command]/get_standard_site_publications";

const DID = "did:plc:example";
const PUB_URI = `at://${DID}/pub.leaflet.publication/main`;
const recUris = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `at://${DID}/pub.leaflet.publication/r${i}`,
  );

let pubRecord = (name: string, description: string) =>
  ({
    name,
    description,
    url: "https://example.leaflet.pub",
    base_path: "example.leaflet.pub",
    preferences: {},
  }) as unknown as PublicationSubscription["record"];

const publication: StandardSitePublicationData = {
  uri: PUB_URI,
  record: pubRecord("Leaflet Lab Note", "Notes from the Leaflet lab."),
  author: { did: DID, handle: "leaflet.pub", displayName: "Leaflet" },
};

const RECOMMENDED_PUBS = [
  [
    "Aaron Ross Powell",
    "Politics, culture, and philosophy through a liberal lens.",
  ],
  ["Atmosphere Community", "News from the Atmosphere, the open social web."],
  ["pckt - notes", "the latest and greatest from pckt!"],
  ["The Slow Web", "Longer thoughts, published less often."],
  ["Field Notes", "Dispatches from wherever we happen to be."],
  ["Marginalia", "Annotations on things worth annotating."],
  ["Weeknotes", "What we shipped, what we broke."],
  ["Dead Letters", "Correspondence that never got sent."],
];

let makeListings = (count: number): PublicationSubscription[] =>
  recUris(count).map((uri, i) => {
    let [name, description] = RECOMMENDED_PUBS[i % RECOMMENDED_PUBS.length];
    return {
      uri,
      record: pubRecord(name, description),
      authorProfile: { handle: `@author${i}.com` },
      publication_subscriptions: [],
      publication_newsletter_settings: { enabled: i === 1 },
      documents_in_publications: [],
    };
  });

let makeIdentity = (loggedIn: boolean): Identity | null =>
  loggedIn
    ? ({
        atp_did: "did:plc:viewer",
        email: "reader@example.com",
        bsky_profiles: { handle: "reader.bsky.social", record: {} },
        publication_subscriptions: [],
        publication_email_subscribers: [],
      } as unknown as Identity)
    : null;

let ownedPubs = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    uri: `at://did:plc:viewer/pub.leaflet.publication/own${i}`,
    name: `My Publication ${i + 1}`,
    icon: null,
    recommendations: [],
  }));

function Case(props: {
  label: string;
  loggedIn: boolean;
  ownedPubCount: number;
  recommendationCount: number;
  children: React.ReactNode;
}) {
  let recs = recUris(props.recommendationCount);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-bold text-tertiary">{props.label}</div>
      <div className="opaque-container p-3 flex justify-center">
        <IdentityContext.Provider
          value={
            {
              identity: makeIdentity(props.loggedIn),
              mutate: (async () => {}) as any,
              identityPending: false,
            } as any
          }
        >
          <SWRConfig
            value={{
              revalidateOnMount: false,
              revalidateIfStale: false,
              revalidateOnFocus: false,
              fallback: {
                [`standard-site-publication:${PUB_URI}`]: publication,
                [unstable_serialize(["publication_recommendations", PUB_URI])]:
                  recs,
                [unstable_serialize([
                  "recommended_pub_listings",
                  recs.join(","),
                ])]: makeListings(props.recommendationCount),
                [unstable_serialize([
                  "viewer-owned-publications",
                  "did:plc:viewer",
                ])]: ownedPubs(props.ownedPubCount),
              },
            }}
          >
            {props.children}
          </SWRConfig>
        </IdentityContext.Provider>
      </div>
    </div>
  );
}

export default function SubscribeSuccessTestPage() {
  let [recommendationCount, setRecommendationCount] = useState(3);
  let [ownedPubCount, setOwnedPubCount] = useState(1);
  let email = (
    <EmailSubscribeSuccess
      email="thisiscelinepark@gmail.com"
      handle="reader.bsky.social"
      publicationUri={PUB_URI}
    />
  );
  return (
    <div className="bg-bg-leaflet min-h-screen p-6 flex flex-col gap-6">
      <div className="flex gap-4 items-center text-sm">
        <label className="flex gap-1 items-center">
          recommendations
          <input
            type="range"
            min={0}
            max={RECOMMENDED_PUBS.length}
            value={recommendationCount}
            onChange={(e) => setRecommendationCount(Number(e.target.value))}
          />
          {recommendationCount}
        </label>
        <label className="flex gap-1 items-center">
          <input
            type="checkbox"
            checked={ownedPubCount > 0}
            onChange={(e) => setOwnedPubCount(e.target.checked ? 1 : 0)}
          />
          viewer owns a publication
        </label>
      </div>
      <Case
        label="Email subscribe — logged in"
        loggedIn
        ownedPubCount={ownedPubCount}
        recommendationCount={recommendationCount}
      >
        {email}
      </Case>
      <Case
        label="Email subscribe — logged out"
        loggedIn={false}
        ownedPubCount={0}
        recommendationCount={recommendationCount}
      >
        <EmailSubscribeSuccess
          email="thisiscelinepark@gmail.com"
          handle={undefined}
          publicationUri={PUB_URI}
        />
      </Case>
      <Case
        label="Atproto subscribe — logged in"
        loggedIn
        ownedPubCount={ownedPubCount}
        recommendationCount={recommendationCount}
      >
        <AtSubscribeSuccess publicationUri={PUB_URI} />
      </Case>
    </div>
  );
}
