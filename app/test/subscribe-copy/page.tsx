"use client";
import { useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { SWRConfig } from "swr";
import { IdentityContext, type Identity } from "components/IdentityProvider";
import { PublicationThemeProvider } from "components/ThemeManager/PublicationThemeProvider";
import { ButtonPrimary } from "components/Buttons";
import { ToggleGroup } from "components/ToggleGroup";
import { SubscribePanel } from "components/Subscribe/SubscribeButton";
import {
  MembersOnlyPaywallCard,
  MembersOnlyPaywallLoading,
  membersOnlyPaywallCopy,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/MembersOnlyPaywall";
import {
  membershipUnlocksGatedPost,
  type AudiencePolicy,
  type GatePolicy,
  type MembershipTiers,
  type ResolvedPublicationMembership,
  type WiderRelease,
} from "src/membership";

const FREE_PUB_URI = "at://did:plc:example/pub.leaflet.publication/free";
const PUBLICATION_URL = "https://example.leaflet.pub";

const TIERS: MembershipTiers = {
  subscriber: { name: "Free", description: "Follow along with public posts." },
  paid: [
    {
      id: "tier-supporter",
      name: "Supporter",
      description: "Unlock members-only posts.",
      monthly_price_cents: 500,
      annual_price_cents: 5000,
    },
    {
      id: "tier-patron",
      name: "Patron",
      description: "Everything, plus our undying gratitude.",
      monthly_price_cents: 1000,
      annual_price_cents: null,
    },
  ],
};

const DAY = 24 * 60 * 60 * 1000;

function MockIdentity(props: {
  identity: Identity;
  children: React.ReactNode;
}) {
  return (
    <IdentityContext.Provider
      value={{
        identity: props.identity,
        mutate: (async () => props.identity) as any,
        identityPending: false,
      }}
    >
      {props.children}
    </IdentityContext.Provider>
  );
}

function MockSWR(props: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        fallback: {
          [`membership-tiers-${FREE_PUB_URI}`]: null,
        },
        revalidateOnMount: false,
        revalidateOnFocus: false,
        revalidateIfStale: false,
        revalidateOnReconnect: false,
      }}
    >
      {props.children}
    </SWRConfig>
  );
}

function Cell(props: {
  label: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-md p-3 flex flex-col gap-2 min-w-0">
      <div className="text-sm font-bold text-secondary">{props.label}</div>
      {props.note && <div className="text-xs text-tertiary">{props.note}</div>}
      {props.children}
    </div>
  );
}

type Viewer = {
  label: string;
  membership: ResolvedPublicationMembership | null;
};
const VIEWERS: Viewer[] = [
  { label: "not subscribed / logged out", membership: null },
  { label: "free subscriber", membership: { kind: "free" } },
  {
    label: "paid Supporter ($5)",
    membership: { kind: "paid", tierId: "tier-supporter" },
  },
  {
    label: "paid Patron ($10)",
    membership: { kind: "paid", tierId: "tier-patron" },
  },
];

const GATES: { label: string; policy: GatePolicy }[] = [
  { label: "subscribers", policy: { audience: "subscribers" } },
  { label: "any paid tier", policy: { audience: "paid" } },
  {
    label: "Patron only",
    policy: { audience: "tiers", tierIds: ["tier-patron"] },
  },
  {
    label: "Supporter only",
    policy: { audience: "tiers", tierIds: ["tier-supporter"] },
  },
  { label: "empty tier list", policy: { audience: "tiers", tierIds: [] } },
];

const RELEASES: {
  label: string;
  days: number;
  audience: AudiencePolicy;
}[] = [
  { label: "public in 1 day", days: 1, audience: { audience: "public" } },
  { label: "public in 5 days", days: 5, audience: { audience: "public" } },
  {
    label: "subscribers in 5 days",
    days: 5,
    audience: { audience: "subscribers" },
  },
  { label: "any paid in 5 days", days: 5, audience: { audience: "paid" } },
  {
    label: "Patron in 5 days",
    days: 5,
    audience: { audience: "tiers", tierIds: ["tier-patron"] },
  },
];

type PaywallState = {
  key: string;
  mode: "locked" | "early access";
  heading: string;
  subscribeConditions: string | null;
  scenarios: string[];
};

function copyShape(text: string | null) {
  return (text ?? "")
    .replace(/\$[\d.,]+/g, "$X")
    .replace(/\d+ days?/g, "N days")
    .replace(
      new RegExp(`for (${TIERS.paid.map((t) => t.name).join("|")}) `),
      "for [tier] ",
    );
}

function paywallStates(now: number): PaywallState[] {
  let states = new Map<string, PaywallState>();
  let releaseOptions: (null | (typeof RELEASES)[number])[] = [
    null,
    ...RELEASES,
  ];
  for (let gate of GATES)
    for (let viewer of VIEWERS)
      for (let release of releaseOptions) {
        if (membershipUnlocksGatedPost(viewer.membership, gate.policy))
          continue;
        let widerRelease: WiderRelease | null = release
          ? {
              at: new Date(now + release.days * DAY - 60_000).toISOString(),
              audience: release.audience,
            }
          : null;
        let copy = membersOnlyPaywallCopy({
          membership: viewer.membership,
          gatePolicy: gate.policy,
          tiers: TIERS.paid,
          widerRelease,
          now,
        });
        let mode: PaywallState["mode"] = copy.earlyAccess
          ? "early access"
          : "locked";
        let key = [copy.heading, copy.subscribeConditions]
          .map(copyShape)
          .join("|");
        let scenario = `gate: ${gate.label} · viewer: ${viewer.label} · release: ${release?.label ?? "none"}`;
        let existing = states.get(key);
        if (existing) existing.scenarios.push(scenario);
        else
          states.set(key, {
            key,
            mode,
            heading: copy.heading,
            subscribeConditions: copy.subscribeConditions,
            scenarios: [scenario],
          });
      }
  return [...states.values()];
}

function PaywallSection() {
  let [now] = useState(() => Date.now());
  let states = useMemo(() => paywallStates(now), [now]);
  let [filter, setFilter] = useState<"all" | "locked" | "early access">("all");
  let shown = states.filter((s) => filter === "all" || s.mode === filter);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="grow">Gated content upsell (paywall)</h2>
        <ToggleGroup
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "locked", label: "Locked" },
            { value: "early access", label: "Early access" },
          ]}
        />
      </div>
      <p className="text-sm text-tertiary">
        Every distinct heading / subscribe-conditions combination{" "}
        <code>membersOnlyPaywallCopy</code> produces across {GATES.length} gates
        × {VIEWERS.length} viewers × {RELEASES.length + 1} release settings,
        using tiers Supporter $5 and Patron $10. Viewers the gate already admits
        are skipped since they never see the paywall.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Cell label="loading" note="unlock status still resolving">
          <MembersOnlyPaywallLoading />
        </Cell>
        {shown.map((s) => (
          <Cell
            key={s.key}
            label={s.mode}
            note={
              <details>
                <summary className="cursor-pointer">
                  {s.scenarios.length} scenario
                  {s.scenarios.length === 1 ? "" : "s"}
                </summary>
                <ul className="list-disc pl-4 pt-1">
                  {s.scenarios.map((sc) => (
                    <li key={sc}>{sc}</li>
                  ))}
                </ul>
              </details>
            }
          >
            <MembersOnlyPaywallCard
              iconSrc={undefined}
              pubName="Test Publication"
              copy={{
                heading: s.heading,
                subscribeConditions: s.subscribeConditions,
                needsUpgrade: false,
                canUpgrade: false,
                earlyAccess: s.mode === "early access",
              }}
            >
              <ButtonPrimary type="button">Subscribe</ButtonPrimary>
            </MembersOnlyPaywallCard>
          </Cell>
        ))}
      </div>
    </section>
  );
}

const NAMES = {
  normal: "Test Publication",
  long: "The Extraordinarily Long-Winded Quarterly Review of Small Things",
  fallback: "Subscribe",
};
const NAME_LABELS: Record<keyof typeof NAMES, string> = {
  normal: "name",
  long: "long name",
  fallback: "no name (editor block)",
};
const DESCRIPTION_LABELS: Record<keyof typeof DESCRIPTIONS, string> = {
  normal: "description",
  long: "long description",
  none: "none",
};
const DESCRIPTIONS = {
  normal: "A publication for previewing the subscribe affordances.",
  long: "Essays, notes, and occasional rambling dispatches about gardening, typography, and the small software tools that make writing on the internet feel a little more like home. New posts most weeks.",
  none: undefined,
};

function SubscribePanelSection() {
  return (
    <section className="flex flex-col gap-4">
      <h2>Subscribe box (post footer + subscribe block)</h2>
      <p className="text-sm text-tertiary">
        The footer box under ungated posts and the published subscribe block
        both render <code>SubscribePanel</code>: the publication name as the
        header and its description as the body. The editor{" "}
        <code>SubscribeBlock</code> uses the same layout and falls back to
        &ldquo;Subscribe&rdquo; when the publication has no name.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {(Object.keys(NAMES) as (keyof typeof NAMES)[]).flatMap((name) =>
          (Object.keys(DESCRIPTIONS) as (keyof typeof DESCRIPTIONS)[]).map(
            (description) => (
              <Cell
                key={`${name}-${description}`}
                label={`header: ${NAME_LABELS[name]} · body: ${DESCRIPTION_LABELS[description]}`}
              >
                <MockIdentity identity={null}>
                  <SubscribePanel
                    publicationUri={FREE_PUB_URI}
                    publicationUrl={PUBLICATION_URL}
                    publicationName={NAMES[name]}
                    publicationDescription={DESCRIPTIONS[description]}
                    newsletterMode
                  />
                </MockIdentity>
              </Cell>
            ),
          ),
        )}
      </div>
    </section>
  );
}

export default function SubscribeCopyPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <MockSWR>
      <PublicationThemeProvider
        record={undefined}
        pub_creator="did:plc:example"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-12 p-6">
          <h1>Subscribe Copy States</h1>
          <PaywallSection />
          <SubscribePanelSection />
        </div>
      </PublicationThemeProvider>
    </MockSWR>
  );
}
