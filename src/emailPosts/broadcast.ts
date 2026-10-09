import { render } from "@react-email/render";
import type { AppBskyFeedDefs } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import { PostEmail, type PostEmailPage } from "emails/post";
import { emailPropsFromPublication } from "emails/fromPublication";
import {
  PubLeafletContent,
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { getProfiles } from "src/identity";
import { formatBylineProfiles, toBylineProfiles } from "src/utils/byline";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import {
  buildFromHeader,
  resolveFromDomain,
  resolveReplyToEmail,
} from "src/utils/newsletterSender";
import { hydrateBskyPostBlocks } from "src/utils/fetchBskyPosts";
import { fetchStandardSiteBlockData } from "src/utils/fetchStandardSiteBlockData";
import { manageSubscriptionUrl } from "src/subscriptions/manageUrl";
import type { Json } from "supabase/database.types";
import { Err, Ok, type Result } from "src/result";
import { prepareEmailRenderImages } from "src/emailRender/render";
import {
  getMembersDelimiterGatePolicy,
  isActiveMembership,
  isEntitledToGatedPost,
  membershipUnlocksGatedPost,
  pageHasMembersDelimiter,
  truncateBlocksAtMembersDelimiter,
} from "src/membership";

// Postmark's /email/batch caps a call at 500 messages AND 50 MB of payload;
// long posts hit the byte cap first, so batches are sized by both.
const BATCH_SIZE = 500;
const MAX_BATCH_BYTES = 40 * 1024 * 1024;
// Distinctive URL used once at render-time and string-replaced per recipient
// so we only pay the React Email render cost once per batch.
const UNSUB_PLACEHOLDER =
  "https://placeholder.leaflet.pub/unsubscribe-token-replace-me";
const MANAGE_PLACEHOLDER =
  "https://placeholder.leaflet.pub/manage-subscription-replace-me";

// Inngest's step.run, narrowed to what the broadcast needs. Step results are
// JSON-serialized, which every value this module memoizes survives unchanged.
export type RunStep = <T>(id: string, fn: () => Promise<T>) => Promise<T>;

export type Subscriber = {
  id: string;
  email: string;
  unsubscribe_token: string;
  identity_id: string | null;
};

export const BROADCAST_PUBLICATION_COLUMNS =
  "record, publication_domains(domain), publication_newsletter_settings(enabled, reply_to_email, reply_to_verified_at), publication_membership_settings(enabled), publication_membership_tiers(id, monthly_price_cents, active)";

export type PublicationForBroadcast = {
  record: Json;
  publication_domains: { domain: string }[] | null;
  publication_newsletter_settings: {
    enabled: boolean;
    reply_to_email: string | null;
    reply_to_verified_at: string | null;
  } | null;
  publication_membership_settings: { enabled: boolean } | null;
  publication_membership_tiers:
    | { id: string; monthly_price_cents: number; active: boolean }[]
    | null;
};

type SenderFields = Pick<
  PublicationForBroadcast,
  "record" | "publication_domains" | "publication_newsletter_settings"
>;

export type BroadcastSender<P extends SenderFields = PublicationForBroadcast> =
  {
    pub: P;
    pubRecord: ReturnType<typeof normalizePublicationRecord>;
    pubProps: ReturnType<typeof emailPropsFromPublication>;
    fromHeader: string;
    replyToEmail: string;
  };

// Who a publication's newsletter comes from, or why it can't send.
export function resolveBroadcastSender<P extends SenderFields>(
  pub: P | null,
): Result<BroadcastSender<P>, "newsletter_not_enabled" | "no_from_address"> {
  const settings = pub?.publication_newsletter_settings;
  if (!pub || !settings?.enabled) return Err("newsletter_not_enabled");
  const pubRecord = normalizePublicationRecord(pub.record);
  const fromDomain = resolveFromDomain(
    pubRecord?.url,
    pub.publication_domains?.[0]?.domain,
  );
  if (!fromDomain) return Err("no_from_address");
  return Ok({
    pub,
    pubRecord,
    pubProps: emailPropsFromPublication(pubRecord),
    fromHeader: buildFromHeader(pubRecord?.name, fromDomain),
    replyToEmail: resolveReplyToEmail(settings),
  });
}

// The first page is the email body: a linear page's blocks, or a canvas,
// which the email shows as one image. The rest are only reachable through
// page blocks, which need an id to be targeted.
export function emailBodyFromPages(pages: PubLeafletContent.Main["pages"]) {
  const first = pages[0];
  return {
    blocks: PubLeafletPagesLinearDocument.isMain(first)
      ? first.blocks ?? []
      : [],
    rootCanvas: PubLeafletPagesCanvas.isMain(first) ? first : undefined,
    pages: pages.filter(
      (p): p is PostEmailPage =>
        (PubLeafletPagesLinearDocument.isMain(p) ||
          PubLeafletPagesCanvas.isMain(p)) &&
        !!p.id,
    ),
  };
}

// Contributor names when there are any, otherwise the author's handle (not
// display name).
export async function emailAuthorName(
  authorDid: string,
  contributorDids: string[],
): Promise<string | undefined> {
  const dids = contributorDids.length > 0 ? contributorDids : [authorDid];
  const profiles = await getProfiles(dids);
  if (contributorDids.length > 0)
    return formatBylineProfiles(toBylineProfiles(dids, profiles));
  return profiles.get(authorDid)?.handle ?? undefined;
}

// A subscriber row can predate the reader's identity link, so readers are
// matched on identity id or on the identity's email address. Takes arrays so
// a step can return them.
function subscriberMatcher(identityIds: string[], emails: string[]) {
  const ids = new Set(identityIds);
  const lowered = new Set(emails.map((e) => e.toLowerCase()));
  return (s: Pick<Subscriber, "identity_id" | "email">) =>
    (!!s.identity_id && ids.has(s.identity_id)) ||
    lowered.has(s.email.toLowerCase());
}

// The publication's confirmed email subscribers (or just one reader's, given
// `identityId`), minus anyone this email already reached — a retried or
// resumed send must not email them twice. `sentMetadata` identifies the email
// in the post_sent event log.
export async function loadUnsentSubscribers(
  publicationUri: string,
  sentMetadata: { key: string; value: string },
  identityId?: string,
): Promise<Subscriber[]> {
  let subscribersQuery = supabaseServerClient
    .from("publication_email_subscribers")
    .select("id, email, unsubscribe_token, identity_id")
    .eq("publication", publicationUri)
    .eq("state", "confirmed");
  if (identityId)
    subscribersQuery = subscribersQuery.eq("identity_id", identityId);
  const { data } = await subscribersQuery;
  const subs = data ?? [];
  if (subs.length === 0) return [];

  let sentQuery = supabaseServerClient
    .from("publication_email_subscriber_events")
    .select("subscriber")
    .eq("publication", publicationUri)
    .eq("event_type", "post_sent")
    .eq(`metadata->>${sentMetadata.key}`, sentMetadata.value);
  if (identityId)
    sentQuery = sentQuery.in(
      "subscriber",
      subs.map((s) => s.id),
    );
  const { data: alreadySent } = await sentQuery;
  const sentTo = new Set((alreadySent ?? []).map((e) => e.subscriber));
  return subs.filter((s) => !sentTo.has(s.id));
}

// Whether a subscriber holds a live paid membership.
export async function loadPaidMembers(publicationUri: string) {
  const { data } = await supabaseServerClient
    .from("publication_memberships")
    .select("identity_id, status, current_period_end, identities(email)")
    .eq("publication", publicationUri);
  const members = (data ?? []).filter(isActiveMembership);
  return subscriberMatcher(
    members.map((m) => m.identity_id),
    members.flatMap((m) => m.identities?.email ?? []),
  );
}

// Renders a post email and sends it to `recipients` in Postmark batches,
// logging a post_sent/send_failed event per recipient. A members-only
// delimiter splits recipients into those entitled to the full body and those
// who get the truncated preview with a join upsell.
export async function broadcastPostEmail(
  run: RunStep,
  args: {
    publicationUri: string;
    authorDid: string;
    sender: BroadcastSender;
    postTitle: string;
    postDescription?: string;
    postUrl: string | undefined;
    authorName?: string;
    publishedAtLabel?: string;
    blocks: PubLeafletPagesLinearDocument.Block[];
    pages: PostEmailPage[];
    rootCanvas?: PubLeafletPagesCanvas.Main;
    recipients: Subscriber[];
    // Written to each event's metadata; must include the key
    // loadUnsentSubscribers dedupes on.
    eventMetadata: Record<string, string>;
  },
) {
  const { publicationUri, authorDid, blocks } = args;
  const { pub, pubRecord, pubProps, fromHeader, replyToEmail } = args.sender;
  const pubTiers = pub.publication_membership_tiers ?? [];
  const firstPageBlocks = args.rootCanvas?.blocks ?? blocks;
  const hasDelimiter =
    !!pub.publication_membership_settings?.enabled &&
    pageHasMembersDelimiter({ blocks: firstPageBlocks });
  const gatePolicy = hasDelimiter
    ? getMembersDelimiterGatePolicy(firstPageBlocks)
    : null;
  // Every recipient is already a subscriber, so a subscriber gate can send
  // the full body to the whole list. Invalid policies remain gated.
  const gated = hasDelimiter && gatePolicy?.audience !== "subscribers";
  const previewBlocks = gated
    ? truncateBlocksAtMembersDelimiter(blocks)
    : blocks;

  const activeTierPrices = pubTiers
    .filter(
      (tier) =>
        tier.active &&
        membershipUnlocksGatedPost(
          { kind: "paid", tierId: tier.id },
          gatePolicy,
        ),
    )
    .map((t) => t.monthly_price_cents);
  const membersUpsell = {
    joinUrl: `${pubProps.publicationUrl.replace(/\/$/, "")}/join`,
    cheapestMonthlyCents: activeTierPrices.length
      ? Math.min(...activeTierPrices)
      : null,
  };

  // Best-effort: hydrateBskyPostBlocks returns {} on failure, so bskyPost
  // blocks degrade to the "not supported" card instead of failing the send.
  const bskyPosts = (await run("hydrate-bsky-posts", async () =>
    hydrateBskyPostBlocks(blocks),
  )) as Record<string, AppBskyFeedDefs.PostView>;

  const { standardSitePosts, standardSitePublications } = await run(
    "load-standard-site-block-data",
    async () => fetchStandardSiteBlockData(blocks),
  );

  const assetsBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"
  ).replace(/\/$/, "");

  const renderImages = await run("render-canvas-images", async () =>
    prepareEmailRenderImages({
      body: { blocks, pages: args.pages, rootCanvas: args.rootCanvas },
      authorDid,
      publicationUri,
      pubRecord,
      assetsBaseUrl,
    }),
  );

  // For a gated post, collect who is entitled to the full body: active
  // members plus the publication owner and confirmed contributors.
  const entitled = !gated
    ? { identityIds: [] as string[], emails: [] as string[] }
    : await run("load-entitled-members", async () => {
        const identityIds = new Set<string>();
        const emails = new Set<string>();
        const [{ data: members }, { data: contributors }] = await Promise.all([
          supabaseServerClient
            .from("publication_memberships")
            .select(
              "identity_id, status, current_period_end, tier, identities(email)",
            )
            .eq("publication", publicationUri),
          supabaseServerClient
            .from("publication_contributors")
            .select("contributor_did")
            .eq("publication", publicationUri)
            .eq("confirmed", true),
        ]);
        for (const m of members ?? []) {
          const entitledMember = isEntitledToGatedPost({
            viewerDid: null,
            ownerDid: null,
            contributors: [],
            paidMembership: m,
            gatePolicy,
          });
          if (!entitledMember) continue;
          identityIds.add(m.identity_id);
          if (m.identities?.email) {
            emails.add(m.identities.email.toLowerCase());
          }
        }
        const dids = [
          authorDid,
          ...(contributors ?? []).map((c) => c.contributor_did),
        ];
        const { data: identities } = await supabaseServerClient
          .from("identities")
          .select("id, email")
          .in("atp_did", dids);
        for (const i of identities ?? []) {
          identityIds.add(i.id);
          if (i.email) emails.add(i.email.toLowerCase());
        }
        return {
          identityIds: [...identityIds],
          emails: [...emails],
        };
      });
  const subscriberIsEntitled = subscriberMatcher(
    entitled.identityIds,
    entitled.emails,
  );

  const groups = (
    gated
      ? [
          {
            key: "preview",
            blocks: previewBlocks,
            // A canvas has no reading order to cut at, so non-members get
            // the "See full post" buttons without the canvas image.
            renderImages: Object.fromEntries(
              Object.entries(renderImages).filter(([id]) => id !== "root"),
            ),
            upsell: true,
            recipients: args.recipients.filter((s) => !subscriberIsEntitled(s)),
          },
          {
            key: "full",
            // Members get everything. The delimiter stays in the array —
            // the email renders it as nothing — so later blocks keep the
            // record indices their #index anchors are built from.
            blocks,
            renderImages,
            upsell: false,
            recipients: args.recipients.filter(subscriberIsEntitled),
          },
        ]
      : [
          {
            key: "all",
            blocks: previewBlocks,
            renderImages,
            upsell: false,
            recipients: args.recipients,
          },
        ]
  ).filter((g) => g.recipients.length > 0);

  const buildMessage = (sub: Subscriber, htmlTemplate: string) => {
    const unsubscribeUrl = `${assetsBaseUrl}/emails/unsubscribe?unsubscribe_token=${encodeURIComponent(
      sub.unsubscribe_token,
    )}`;
    const manageUrl = manageSubscriptionUrl({
      baseUrl: assetsBaseUrl,
      email: sub.email,
      publicationUrl: pubProps.publicationUrl,
    });
    const htmlBody = htmlTemplate
      .split(UNSUB_PLACEHOLDER)
      .join(unsubscribeUrl)
      .split(MANAGE_PLACEHOLDER)
      .join(manageUrl.replace(/&/g, "&amp;"));
    return {
      MessageStream: "broadcast",
      From: fromHeader,
      ReplyTo: replyToEmail,
      To: sub.email,
      Subject: args.postTitle,
      HtmlBody: htmlBody,
      Headers: [
        {
          Name: "List-Unsubscribe-Post",
          Value: "List-Unsubscribe=One-Click",
        },
        {
          Name: "List-Unsubscribe",
          Value: `<${unsubscribeUrl}>`,
        },
      ],
      Metadata: {
        subscriber_id: sub.id,
        publication: publicationUri,
      },
    };
  };

  for (const group of groups) {
    // Render once per group with a placeholder, then string-replace per
    // recipient.
    const htmlTemplate = await run(`render-template-${group.key}`, async () => {
      return render(
        PostEmail({
          ...pubProps,
          postTitle: args.postTitle,
          postDescription: args.postDescription,
          postUrl: args.postUrl,
          authorName: args.authorName,
          publishedAtLabel: args.publishedAtLabel,
          blocks: group.blocks,
          pages: args.pages,
          canvasPost: !!args.rootCanvas,
          renderImages: group.renderImages,
          bskyPosts,
          standardSitePosts,
          standardSitePublications,
          currentPublicationUri: publicationUri,
          did: authorDid,
          assetsBaseUrl: `${assetsBaseUrl}/`,
          unsubscribeUrl: UNSUB_PLACEHOLDER,
          manageUrl: MANAGE_PLACEHOLDER,
          membersUpsell: group.upsell ? membersUpsell : undefined,
        }),
      );
    });

    const bytesPerMessage = Buffer.byteLength(
      JSON.stringify(buildMessage(group.recipients[0], htmlTemplate)),
    );
    const batchSize = Math.max(
      1,
      Math.min(BATCH_SIZE, Math.floor(MAX_BATCH_BYTES / bytesPerMessage)),
    );
    const chunks: Subscriber[][] = [];
    for (let i = 0; i < group.recipients.length; i += batchSize) {
      chunks.push(group.recipients.slice(i, i + batchSize));
    }

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      const batchResults = await run(
        `send-batch-${group.key}-${ci}`,
        async (): Promise<
          {
            subscriber_id: string;
            ok: boolean;
            code: number;
            message: string;
          }[]
        > => {
          const messages = chunk.map((sub) => buildMessage(sub, htmlTemplate));

          const res = await fetch("https://api.postmarkapp.com/email/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
            },
            body: JSON.stringify(messages),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            // Throwing triggers Inngest step-retry for transport failures.
            throw new Error(
              `Postmark /email/batch ${res.status}: ${body.slice(0, 500)}`,
            );
          }
          const raw = (await res.json()) as Array<{
            ErrorCode: number;
            Message: string;
          }>;
          return chunk.map((sub, i) => ({
            subscriber_id: sub.id,
            ok: raw[i]?.ErrorCode === 0,
            code: raw[i]?.ErrorCode ?? -1,
            message: raw[i]?.Message ?? "no response",
          }));
        },
      );

      await run(`log-events-${group.key}-${ci}`, async () => {
        const rows = batchResults.map((r) => ({
          subscriber: r.subscriber_id,
          publication: publicationUri,
          event_type: r.ok ? "post_sent" : "send_failed",
          metadata: (r.ok
            ? args.eventMetadata
            : {
                ...args.eventMetadata,
                code: r.code,
                message: r.message,
              }) as unknown as Json,
        }));
        // The subscriber snapshot dedupes retries on these rows, so a lost
        // insert would re-email the whole batch on a resend. Throw so Inngest
        // retries the (atomic) insert and surfaces exhaustion in onFailure.
        const { error } = await supabaseServerClient
          .from("publication_email_subscriber_events")
          .insert(rows);
        if (error) {
          throw new Error(
            `event insert failed for batch ${group.key}-${ci}: ${error.message}`,
          );
        }
      });

      // Partial per-recipient failures (ErrorCode !== 0) don't count as
      // a terminal failure — the send still completes. Per-recipient
      // failure signal lives in the event log. Transport-level batch failures
      // throw above and exhaust retries into the function's onFailure handler.
    }
  }
}
