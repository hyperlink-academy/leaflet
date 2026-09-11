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
const REC_URIS = [1, 2, 3].map((n) => `at://${DID}/pub.leaflet.publication/r${n}`);

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

const listings: PublicationSubscription[] = [
  ["Aaron Ross Powell", "Politics, culture, and philosophy through a liberal lens."],
  ["Atmosphere Community", "News from the Atmosphere, the open social web."],
  ["pckt - notes", "the latest and greatest from pckt!"],
].map(([name, description], i) => ({
  uri: REC_URIS[i],
  record: pubRecord(name, description),
  authorProfile: { handle: `@author${i}.com` },
  publication_subscriptions: [],
  publication_newsletter_settings: { enabled: i === 1 },
  documents_in_publications: [],
}));

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
  recommendations: boolean;
  children: React.ReactNode;
}) {
  let recs = props.recommendations ? REC_URIS : [];
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
                [unstable_serialize(["publication_recommendations", PUB_URI])]: recs,
                [unstable_serialize([
                  "recommended_pub_listings",
                  recs.join(","),
                ])]: props.recommendations ? listings : [],
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
  let [recommendations, setRecommendations] = useState(true);
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
          <input
            type="checkbox"
            checked={recommendations}
            onChange={(e) => setRecommendations(e.target.checked)}
          />
          has recommendations
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
        recommendations={recommendations}
      >
        {email}
      </Case>
      <Case
        label="Email subscribe — logged out"
        loggedIn={false}
        ownedPubCount={0}
        recommendations={recommendations}
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
        recommendations={recommendations}
      >
        <AtSubscribeSuccess publicationUri={PUB_URI} />
      </Case>
    </div>
  );
}
