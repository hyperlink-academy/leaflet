import { render } from "@react-email/render";
import { AtUri } from "@atproto/syntax";
import { inngest, events } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { PostEmail } from "emails/post";
import { emailPropsFromPublication } from "emails/fromPublication";
import {
  getDocumentPages,
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import {
  buildFromHeader,
  resolveFromDomain,
  resolveReplyToEmail,
} from "src/utils/newsletterSender";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { ids } from "lexicons/api/lexicons";
import type { AppBskyFeedDefs } from "@atproto/api";
import { hydrateBskyPostBlocks } from "src/utils/fetchBskyPosts";
import { fetchStandardSiteBlockData } from "src/utils/fetchStandardSiteBlockData";
import { getProfiles } from "src/identity";
import {
  getBylineDids,
  hasExplicitByline,
  toBylineProfiles,
  formatBylineProfiles,
} from "src/utils/byline";
import type { Json } from "supabase/database.types";
import {
  isActiveMembership,
  pageHasMembersDelimiter,
  truncateBlocksAtMembersDelimiter,
} from "src/membership";

const BATCH_SIZE = 500;
// Distinctive URL used once at render-time and string-replaced per recipient
// so we only pay the React Email render cost once per batch.
const UNSUB_PLACEHOLDER =
  "https://placeholder.leaflet.pub/unsubscribe-token-replace-me";

export const send_post_broadcast = inngest.createFunction(
  {
    id: "send_post_broadcast",
    onFailure: async ({ event, error }) => {
      // Exhausted step retries — mark the row as failed so it doesn't
      // sit in `sending` forever. The error surfaces in the Inngest UI too.
      const { publication_uri, document_uri } = event.data.event.data;
      await supabaseServerClient
        .from("publication_post_sends")
        .update({
          status: "failed",
          error: String(error?.message ?? error).slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq("publication", publication_uri)
        .eq("document", document_uri);
    },
    triggers: [events.newsletterPostSendRequested],
  },
  async ({ event, step }) => {
    const { publication_uri, document_uri } = event.data;

    const authorDid = new AtUri(document_uri).host;

    const loaded = await step.run("load-pub-and-doc", async () => {
      const [pubRes, docRes] = await Promise.all([
        supabaseServerClient
          .from("publications")
          .select(
            "record, publication_domains(domain), publication_newsletter_settings(enabled, reply_to_email, reply_to_verified_at), publication_membership_settings(enabled), publication_membership_tiers(monthly_price_cents, active)",
          )
          .eq("uri", publication_uri)
          .maybeSingle(),
        supabaseServerClient
          .from("documents")
          .select("data")
          .eq("uri", document_uri)
          .maybeSingle(),
      ]);
      return {
        pub: pubRes.data,
        doc: docRes.data,
      };
    });

    const settings = loaded.pub?.publication_newsletter_settings;
    if (!loaded.pub || !settings?.enabled) {
      await step.run("mark-failed-not-enabled", async () => {
        await supabaseServerClient
          .from("publication_post_sends")
          .update({
            status: "failed",
            error: "newsletter_not_enabled",
            completed_at: new Date().toISOString(),
          })
          .eq("publication", publication_uri)
          .eq("document", document_uri);
      });
      return { aborted: "newsletter_not_enabled" };
    }

    const pubRecord = normalizePublicationRecord(loaded.pub.record);
    const docRecord = normalizeDocumentRecord(loaded.doc?.data, document_uri);
    const pubProps = emailPropsFromPublication(pubRecord);
    const postTitle = docRecord?.title || "(untitled)";
    const postDescription = docRecord?.description;
    const postUrl =
      pubRecord?.url && docRecord?.path
        ? `${pubRecord.url.replace(/\/$/, "")}${docRecord.path}`
        : pubProps.publicationUrl;
    const fromDomain = resolveFromDomain(
      pubRecord?.url,
      loaded.pub.publication_domains?.[0]?.domain,
    );
    if (!fromDomain) {
      await step.run("mark-failed-no-from-address", async () => {
        await supabaseServerClient
          .from("publication_post_sends")
          .update({
            status: "failed",
            error: "no_from_address",
            completed_at: new Date().toISOString(),
          })
          .eq("publication", publication_uri)
          .eq("document", document_uri);
      });
      return { aborted: "no_from_address" };
    }
    const fromHeader = buildFromHeader(pubRecord?.name, fromDomain);
    const replyToEmail = resolveReplyToEmail(settings);
    const did = authorDid;

    // Byline: render contributor names when the doc has an explicit byline,
    // otherwise fall back to the single document author (the URI host DID).
    const hasContributors = hasExplicitByline(docRecord, authorDid);
    const bylineDids = getBylineDids(docRecord, authorDid);
    const bylineProfiles = await step.run("load-byline-profiles", async () =>
      toBylineProfiles(bylineDids, await getProfiles(bylineDids)),
    );
    let authorName: string | undefined;
    if (hasContributors) {
      authorName = formatBylineProfiles(bylineProfiles);
    } else {
      // Preserve previous behavior exactly for the single-author default:
      // use the author's handle (not displayName).
      authorName = bylineProfiles[0]?.handle ?? undefined;
    }
    const publishedAtLabel = docRecord?.publishedAt
      ? new Date(docRecord.publishedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined;

    // The first page is the document body. Canvas pages don't map to a linear
    // email body — the email renders an empty postContent section and falls
    // back to the "See Full Post" link.
    const firstPage = docRecord ? getDocumentPages(docRecord)?.[0] : undefined;
    let blocks: PubLeafletPagesLinearDocument.Block[] =
      firstPage?.$type === "pub.leaflet.pages.linearDocument"
        ? (firstPage as PubLeafletPagesLinearDocument.Main).blocks ?? []
        : [];
    // When the post is gated, subscribers with an active membership (plus the
    // owner and confirmed contributors) get the full body by email; everyone
    // else gets only the preview above the delimiter (the post link paywalls).
    const gated =
      !!loaded.pub.publication_membership_settings?.enabled &&
      pageHasMembersDelimiter({ blocks });
    const previewBlocks = gated
      ? truncateBlocksAtMembersDelimiter(blocks)
      : blocks;
    // Non-members' emails end in a "subscribe to see the full content" box
    // linking to the join page, priced from the cheapest active tier.
    const activeTierPrices = (loaded.pub.publication_membership_tiers ?? [])
      .filter((t) => t.active)
      .map((t) => t.monthly_price_cents);
    const membersUpsell = {
      joinUrl: `${pubProps.publicationUrl.replace(/\/$/, "")}/join`,
      cheapestMonthlyCents: activeTierPrices.length
        ? Math.min(...activeTierPrices)
        : null,
    };

    // Best-effort: hydrateBskyPostBlocks returns {} on failure, so bskyPost
    // blocks degrade to the "not supported" card instead of failing the send.
    const bskyPosts = (await step.run("hydrate-bsky-posts", async () =>
      hydrateBskyPostBlocks(blocks),
    )) as Record<string, AppBskyFeedDefs.PostView>;

    const { standardSitePosts, standardSitePublications } = (await step.run(
      "load-standard-site-block-data",
      async () => fetchStandardSiteBlockData(blocks),
    )) as Awaited<ReturnType<typeof fetchStandardSiteBlockData>>;

    const subscribers = await step.run("snapshot-subscribers", async () => {
      const { data } = await supabaseServerClient
        .from("publication_email_subscribers")
        .select("id, email, unsubscribe_token, identity_id")
        .eq("publication", publication_uri)
        .eq("state", "confirmed");
      const subs = data ?? [];
      await supabaseServerClient
        .from("publication_post_sends")
        .update({ status: "sending", subscriber_count: subs.length })
        .eq("publication", publication_uri)
        .eq("document", document_uri);
      return subs;
    });

    if (subscribers.length === 0) {
      await step.run("finalize-empty", async () => {
        await supabaseServerClient
          .from("publication_post_sends")
          .update({
            status: "sent",
            completed_at: new Date().toISOString(),
          })
          .eq("publication", publication_uri)
          .eq("document", document_uri);
      });
      return { sent: 0 };
    }

    const assetsBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub"
    ).replace(/\/$/, "");

    // For a gated post, collect who is entitled to the full body: active
    // members plus the publication owner and confirmed contributors. Email
    // subscriptions and memberships are both keyed to identities, but a
    // subscriber row can predate the reader's identity link, so match on
    // identity id or on the identity's email address.
    const entitled = !gated
      ? { identityIds: [] as string[], emails: [] as string[] }
      : await step.run("load-entitled-members", async () => {
          const identityIds = new Set<string>();
          const emails = new Set<string>();
          const [{ data: members }, { data: contributors }] = await Promise.all(
            [
              supabaseServerClient
                .from("publication_memberships")
                .select(
                  "identity_id, status, current_period_end, identities(email)",
                )
                .eq("publication", publication_uri),
              supabaseServerClient
                .from("publication_contributors")
                .select("contributor_did")
                .eq("publication", publication_uri)
                .eq("confirmed", true),
            ],
          );
          for (const m of members ?? []) {
            if (!isActiveMembership(m)) continue;
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
    const entitledIdentityIds = new Set(entitled.identityIds);
    const entitledEmails = new Set(entitled.emails);
    const subscriberIsEntitled = (s: (typeof subscribers)[number]) =>
      (!!s.identity_id && entitledIdentityIds.has(s.identity_id)) ||
      entitledEmails.has(s.email.toLowerCase());

    const groups = (
      gated
        ? [
            {
              key: "preview",
              blocks: previewBlocks,
              upsell: true,
              recipients: subscribers.filter((s) => !subscriberIsEntitled(s)),
            },
            {
              key: "full",
              // Members get everything; the delimiter itself would render as
              // an unsupported-block callout mid-email, so drop it.
              blocks: blocks.filter(
                (b) =>
                  b.block?.$type !== ids.PubLeafletBlocksMembersOnlyDelimiter,
              ),
              upsell: false,
              recipients: subscribers.filter(subscriberIsEntitled),
            },
          ]
        : [
            {
              key: "all",
              blocks: previewBlocks,
              upsell: false,
              recipients: subscribers,
            },
          ]
    ).filter((g) => g.recipients.length > 0);

    for (const group of groups) {
      // Render once per group with a placeholder, then string-replace per
      // recipient.
      const htmlTemplate = await step.run(
        `render-template-${group.key}`,
        async () => {
          return render(
            PostEmail({
              ...pubProps,
              postTitle,
              postDescription,
              postUrl,
              authorName,
              publishedAtLabel,
              blocks: group.blocks,
              bskyPosts,
              standardSitePosts,
              standardSitePublications,
              currentPublicationUri: publication_uri,
              did,
              assetsBaseUrl: `${assetsBaseUrl}/`,
              unsubscribeUrl: UNSUB_PLACEHOLDER,
              membersUpsell: group.upsell ? membersUpsell : undefined,
            }),
          );
        },
      );

      const chunks: (typeof subscribers)[] = [];
      for (let i = 0; i < group.recipients.length; i += BATCH_SIZE) {
        chunks.push(group.recipients.slice(i, i + BATCH_SIZE));
      }

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const batchResults = await step.run(
          `send-batch-${group.key}-${ci}`,
          async (): Promise<
            {
              subscriber_id: string;
              ok: boolean;
              code: number;
              message: string;
            }[]
          > => {
            const messages = chunk.map((sub) => {
              const unsubscribeUrl = `${assetsBaseUrl}/emails/unsubscribe?unsubscribe_token=${encodeURIComponent(
                sub.unsubscribe_token,
              )}`;
              const htmlBody = htmlTemplate
                .split(UNSUB_PLACEHOLDER)
                .join(unsubscribeUrl);
              return {
                MessageStream: "broadcast",
                From: fromHeader,
                ReplyTo: replyToEmail,
                To: sub.email,
                Subject: postTitle,
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
                  publication: publication_uri,
                },
              };
            });

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

        await step.run(`log-events-${group.key}-${ci}`, async () => {
          const rows = batchResults.map((r) => ({
            subscriber: r.subscriber_id,
            publication: publication_uri,
            event_type: r.ok ? "post_sent" : "send_failed",
            metadata: (r.ok
              ? { document: document_uri }
              : {
                  document: document_uri,
                  code: r.code,
                  message: r.message,
                }) as unknown as Json,
          }));
          const { error } = await supabaseServerClient
            .from("publication_email_subscriber_events")
            .insert(rows);
          if (error) {
            console.error("[send_post_broadcast] event insert failed:", error);
          }
        });

        // Partial per-recipient failures (ErrorCode !== 0) don't count as
        // a terminal failure — the row still transitions to `sent`. Per-recipient
        // failure signal lives in the event log. Transport-level batch failures
        // throw above and exhaust retries into the function's onFailure handler.
      }
    }

    await step.run("finalize", async () => {
      await supabaseServerClient
        .from("publication_post_sends")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
        })
        .eq("publication", publication_uri)
        .eq("document", document_uri);
    });

    return { sent: subscribers.length };
  },
);
