"use client";
// Geometry harness for the identity-resolve layout-shift work (Stage 2.3/2.4).
// Renders each real surface that hosts an identity-dependent control, with a
// sentinel element after it, and lets a puppeteer script flip the identity in
// place through the real SWR key — exactly what ViewerIdentityProvider does when
// its fetch resolves.
import { useEffect, useState } from "react";
import { mutate } from "swr";
import {
  ViewerIdentityProvider,
  VIEWER_IDENTITY_KEY,
  type Identity,
} from "components/IdentityProvider";
import {
  SubscribeButton,
  SubscribeInput,
  SubscribePanel,
  type SubscribeProps,
} from "components/Subscribe/SubscribeButton";
import {
  PublicationHeader,
  NewPublicationHeader,
} from "app/(app)/(published)/lish/[did]/[publication]/PublicationHeader";
import { PublicationNav } from "app/(app)/(published)/lish/[did]/[publication]/PublicationNav";
import { PublicationNavSubscribe } from "app/(app)/(published)/lish/[did]/[publication]/PublicationNavSubscribe";
import { PostHeader } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostHeader/PostHeader";
import { ExpandedInteractions } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/Interactions";
import { PublishedPollBlock } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/PublishedPollBlock";
import { DocumentProvider } from "contexts/DocumentContext";

const PUBLICATION_URI = "at://did:plc:example/pub.leaflet.publication/test";
const PUBLICATION_URL = "https://example.leaflet.pub";

const baseProps: Omit<SubscribeProps, "newsletterMode"> = {
  publicationUri: PUBLICATION_URI,
  publicationUrl: PUBLICATION_URL,
  publicationName: "Test Publication",
  publicationDescription:
    "A publication for previewing the subscribe affordances.",
};

type StateName =
  | "loggedOut"
  | "inHandle"
  | "inEmail"
  | "inBoth"
  | "subAtproto"
  | "subEmail"
  | "subAtprotoOnly";

function makeIdentity(state: StateName): Identity {
  if (state === "loggedOut") return null;
  const hasHandle = state !== "inEmail" && state !== "subEmail";
  const hasEmail = state !== "inHandle" && state !== "subAtprotoOnly";
  return {
    atp_did: hasHandle ? "did:plc:example" : null,
    email: hasEmail ? "reader@example.com" : null,
    bsky_profiles: hasHandle
      ? {
          did: "did:plc:example",
          handle: "reader.bsky.social",
          record: { did: "did:plc:example", handle: "reader.bsky.social" },
        }
      : null,
    publication_subscriptions:
      state === "subAtproto" || state === "subAtprotoOnly"
        ? [{ publication: PUBLICATION_URI }]
        : [],
    publication_email_subscribers:
      state === "subEmail"
        ? [{ publication: PUBLICATION_URI, state: "confirmed" }]
        : [],
  } as unknown as Identity;
}

const tabs = [
  { id: 1, path: "/", title: "Home", sort_order: "a" },
  { id: 2, path: "/archive", title: "Archive", sort_order: "b" },
  { id: 3, path: "/about", title: "About", sort_order: "c" },
];
const manyTabs = [
  ...tabs,
  {
    id: 4,
    path: "/newsletter-archive",
    title: "Newsletter Archive",
    sort_order: "d",
  },
  {
    id: 5,
    path: "/contributors",
    title: "Contributors and friends",
    sort_order: "e",
  },
  {
    id: 6,
    path: "/very-long-tab-name",
    title: "A Very Long Tab Name Here",
    sort_order: "f",
  },
];

function Surface(props: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div data-surface={props.name}>{props.children}</div>
      <div data-sentinel={props.name} className="h-4 bg-border-light" />
    </div>
  );
}

function StateSwitcher() {
  let [state, setState] = useState<StateName>("loggedOut");
  useEffect(() => {
    (window as any).__setIdentityState = (s: StateName) => {
      setState(s);
      return mutate(VIEWER_IDENTITY_KEY, makeIdentity(s), {
        revalidate: false,
      });
    };
  }, []);
  return (
    <div data-probe="state" className="text-sm text-tertiary">
      {state}
    </div>
  );
}

const OWNER_DID = "did:plc:example";
const PUB = {
  uri: PUBLICATION_URI,
  name: "Test Publication",
  identity_did: OWNER_DID,
  record: { $type: "pub.leaflet.publication", name: "Test Publication" },
};
const LONG_PUB = {
  ...PUB,
  name: "A Publication With A Genuinely Very Long Name That Fills The Row",
  record: {
    $type: "pub.leaflet.publication",
    name: "A Publication With A Genuinely Very Long Name That Fills The Row",
  },
};
const DOC_URI = "at://did:plc:example/pub.leaflet.document/doc";
const normalizedDocument = {
  $type: "site.standard.document",
  title: "A Post Title",
  description: "A post description",
  publishedAt: "2026-01-02T03:04:05.000Z",
  tags: ["one", "two"],
  path: "/doc",
  site: PUBLICATION_URL,
} as any;

const docContext = {
  uri: DOC_URI,
  normalizedDocument,
  normalizedPublication: null,
  postUrl: `${PUBLICATION_URL}/doc`,
  theme: null,
  prevNext: { prev: null, next: null },
  quotesAndMentions: [],
  publication: PUB,
  commentsCount: 0,
  commentsCountByPage: { "": 2 },
  mentions: [],
  leafletId: "leaflet-id",
  recommendsCount: 3,
} as any;

const postData = (pub: typeof PUB) =>
  ({
    data: {},
    uri: DOC_URI,
    normalizedDocument,
    documents_in_publications: [{ publications: pub }],
    leaflets_in_publications: [{ leaflet: "leaflet-id" }],
    quotesAndMentions: [],
    commentsCountByPage: { "": 2 },
    recommendsCount: 3,
  }) as any;

const pollBlock = {
  $type: "pub.leaflet.blocks.poll",
  pollRef: {
    uri: "at://did:plc:example/pub.leaflet.poll.definition/p",
    cid: "cid",
  },
} as any;
const pollData = (options: number) =>
  ({
    uri: "at://did:plc:example/pub.leaflet.poll.definition/p",
    cid: "cid",
    record: {
      $type: "pub.leaflet.poll.definition",
      options: Array.from({ length: options }, (_, i) => ({
        text: `Option number ${i + 1}`,
      })),
    },
    atp_poll_votes: [
      {
        voter_did: OWNER_DID,
        record: { $type: "pub.leaflet.poll.vote", option: ["0"] },
      },
      {
        voter_did: "did:plc:someone",
        record: { $type: "pub.leaflet.poll.vote", option: ["1"] },
      },
    ],
  }) as any;

function PostSurfaces() {
  return (
    <DocumentProvider value={docContext}>
      <div className="flex flex-col gap-8" style={{ width: 640 }}>
        <Surface name="postheader-short">
          <PostHeader data={postData(PUB)} preferences={{}} />
        </Surface>
        <Surface name="postheader-long">
          <PostHeader data={postData(LONG_PUB)} preferences={{}} />
        </Surface>
        <Surface name="postheader-narrow">
          <div style={{ width: 320 }}>
            <PostHeader data={postData(LONG_PUB)} preferences={{}} />
          </div>
        </Surface>
        <Surface name="interactions">
          <ExpandedInteractions
            quotesCount={1}
            commentsCount={2}
            recommendsCount={3}
            showComments
            showMentions
            showRecommends
          />
        </Surface>
        <Surface name="interactions-narrow">
          <div style={{ width: 360 }}>
            <ExpandedInteractions
              quotesCount={1}
              commentsCount={2}
              recommendsCount={3}
              showComments
              showMentions
              showRecommends
            />
          </div>
        </Surface>
        <Surface name="poll-2">
          <PublishedPollBlock block={pollBlock} pollData={pollData(2)} />
        </Surface>
        <Surface name="poll-5">
          <PublishedPollBlock block={pollBlock} pollData={pollData(5)} />
        </Surface>
      </div>
    </DocumentProvider>
  );
}

export default function SubscribeGeometryPage() {
  return (
    <ViewerIdentityProvider>
      <div id="harness" className="flex flex-col gap-8 p-4">
        <StateSwitcher />
        <PostSurfaces />
        {[true, false].map((newsletterMode) => {
          const subscribe = { ...baseProps, newsletterMode };
          const suffix = newsletterMode ? "nl" : "at";
          return (
            <div
              key={suffix}
              className="flex flex-col gap-8"
              style={{ width: 1000 }}
            >
              <Surface name={`nav-short-${suffix}`}>
                <PublicationNav
                  publicationUrl={PUBLICATION_URL}
                  pages={tabs}
                  activePath="/"
                  hideSubscribeInHeader
                  subscribe={subscribe}
                />
              </Surface>
              <Surface name={`nav-long-${suffix}`}>
                <PublicationNav
                  publicationUrl={PUBLICATION_URL}
                  pages={manyTabs}
                  activePath="/"
                  hideSubscribeInHeader
                  subscribe={subscribe}
                />
              </Surface>
              <Surface name={`nav-crowded-${suffix}`}>
                <div style={{ width: 520 }}>
                  <PublicationNav
                    publicationUrl={PUBLICATION_URL}
                    pages={manyTabs}
                    activePath="/"
                    hideSubscribeInHeader
                    subscribe={subscribe}
                  />
                </div>
              </Surface>
              <Surface name={`nav-input-${suffix}`}>
                <PublicationNavSubscribe input {...subscribe} />
              </Surface>
              <Surface name={`new-header-${suffix}`}>
                <NewPublicationHeader
                  iconUrl="https://leaflet.pub/icon.png"
                  description="A publication for previewing the subscribe affordances."
                  subscribe={subscribe}
                />
              </Surface>
              <Surface name={`legacy-header-${suffix}`}>
                <PublicationHeader
                  iconUrl="https://leaflet.pub/icon.png"
                  publicationName={baseProps.publicationName}
                  description="A publication for previewing the subscribe affordances."
                  subscribe={subscribe}
                />
              </Surface>
              <Surface name={`panel-${suffix}`}>
                <div className="w-md max-w-full mx-auto">
                  <SubscribePanel {...subscribe} />
                </div>
              </Surface>
              <Surface name={`button-bare-${suffix}`}>
                <div className="flex justify-end">
                  <SubscribeButton {...subscribe} />
                </div>
              </Surface>
              <Surface name={`input-bare-${suffix}`}>
                <div className="max-w-sm mx-auto sm:w-fit w-full">
                  <SubscribeInput {...subscribe} />
                </div>
              </Surface>
            </div>
          );
        })}
      </div>
    </ViewerIdentityProvider>
  );
}
