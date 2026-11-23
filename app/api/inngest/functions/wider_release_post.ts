import { AtUri } from "@atproto/syntax";
import { inngest, events } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import {
  getDocumentPages,
  normalizeDocumentRecord,
} from "src/utils/normalizeRecords";
import { getBylineDids, hasExplicitByline } from "src/utils/byline";
import { revalidateDocumentPaths } from "src/utils/revalidatePublication";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient } from "lexicons/api";
import { documentRecordForPDS } from "src/utils/documentRecordForPDS";
import {
  BROADCAST_PUBLICATION_COLUMNS,
  broadcastPostEmail,
  emailAuthorName,
  emailBodyFromPages,
  loadEntitledReaders,
  loadUnsentSubscribers,
  resolveBroadcastSender,
  subscriberMatcher,
  type RunStep,
} from "src/emailPosts/broadcast";
import {
  getFirstPageMembersDelimiter,
  getMembersDelimiterGatePolicy,
  pageHasMembersDelimiter,
} from "src/membership";

// Widens a gated post's audience at its delimiter's widerReleaseAt: refreshes the
// cached pages and the members_only flag listings read, then, for a post that
// went out as a newsletter, emails the subscribers who just gained access.
export const wider_release_post = inngest.createFunction(
  {
    id: "wider_release_post",
    idempotency: "event.data.document_uri + '-' + event.data.wider_release_at",
    triggers: [events.postWiderReleaseScheduled],
  },
  async ({ event, step }) => {
    const { publication_uri, document_uri, wider_release_at } = event.data;
    const run: RunStep = (id, fn) => step.run(id, fn) as Promise<any>;

    if (new Date(wider_release_at) > new Date())
      await step.sleepUntil("wait-for-wider-release-at", wider_release_at);

    const loaded = await run("load-pub-and-doc", async () => {
      const [pubRes, docRes, sendRes] = await Promise.all([
        supabaseServerClient
          .from("publications")
          .select(BROADCAST_PUBLICATION_COLUMNS)
          .eq("uri", publication_uri)
          .maybeSingle(),
        supabaseServerClient
          .from("documents")
          .select("data")
          .eq("uri", document_uri)
          .maybeSingle(),
        supabaseServerClient
          .from("publication_post_sends")
          .select("status")
          .eq("publication", publication_uri)
          .eq("document", document_uri)
          .maybeSingle(),
      ]);
      return {
        pub: pubRes.data,
        doc: docRes.data,
        sendStatus: sendRes.data?.status ?? null,
      };
    });

    const docRecord = normalizeDocumentRecord(loaded.doc?.data, document_uri);
    const docPages = docRecord ? getDocumentPages(docRecord) ?? [] : [];
    if (
      getFirstPageMembersDelimiter(docPages)?.widerReleaseAt !==
      wider_release_at
    )
      return { skipped: "superseded" };

    await run("refresh-gate", async () => {
      await supabaseServerClient
        .from("documents_in_publications")
        .update({ members_only: pageHasMembersDelimiter(docPages[0]) })
        .eq("publication", publication_uri)
        .eq("document", document_uri);
      await revalidateDocumentPaths(document_uri);
    });

    const widerReleaseTime = new Date(wider_release_at).getTime();
    const { blocks, pages, rootCanvas } = emailBodyFromPages(docPages);
    const firstPageBlocks = rootCanvas?.blocks ?? blocks;
    const liftedForEveryone = !pageHasMembersDelimiter(
      { blocks: firstPageBlocks },
      widerReleaseTime,
    );

    // Until now the PDS copy stopped at the delimiter. A failure here (say
    // the owner's session has lapsed) mustn't hold up the emails; the next
    // publish writes the full copy too.
    const pds = liftedForEveryone
      ? await run("write-full-pds-copy", () =>
          writeFullPdsCopy(document_uri, loaded.doc?.data),
        )
      : null;

    // Only a post that was emailed when it was published gets a follow-up.
    const sender = resolveBroadcastSender(loaded.pub);
    if (!sender.ok || loaded.sendStatus !== "sent")
      return {
        pds,
        emailed: 0,
        reason: sender.ok ? "not_emailed" : sender.error,
      };

    const before = getMembersDelimiterGatePolicy(
      firstPageBlocks,
      widerReleaseTime - 1,
    );
    // Every recipient is a subscriber, so a subscriber gate already reached
    // all of them at publish.
    if (before?.audience === "subscribers") return { pds, emailed: 0 };

    const authorDid = new AtUri(document_uri).host;
    // Everyone early access left out gets their first email for the post
    // now: the full post with the wider-release note if the release reached
    // them, otherwise the cut-off preview and join box, as a gated post's
    // email would have been. broadcastPostEmail sorts them by the gate as it
    // stands after the release.
    const recipients = await run("snapshot-left-out", async () => {
      // Anyone the publish-time send already reached is skipped too, so a
      // release that had passed by first publish can't email them twice.
      const [subs, notSentAtPublish] = await Promise.all([
        loadUnsentSubscribers(publication_uri, {
          key: "wider_release_document",
          value: document_uri,
        }),
        loadUnsentSubscribers(publication_uri, {
          key: "document",
          value: document_uri,
        }).then((rows) => new Set(rows.map((r) => r.id))),
      ]);
      const candidates = subs.filter((s) => notSentAtPublish.has(s.id));
      if (candidates.length === 0) return [];
      const hadAccess = await loadEntitledReaders(
        publication_uri,
        authorDid,
        before,
      );
      const hadAccessMatch = subscriberMatcher(
        hadAccess.identityIds,
        hadAccess.emails,
      );
      return candidates.filter((s) => !hadAccessMatch(s));
    });
    if (recipients.length === 0) return { pds, emailed: 0 };

    const pubRecord = sender.value.pubRecord;
    const postTitle = docRecord?.title || "(untitled)";
    const authorName =
      (await run("load-byline", () =>
        emailAuthorName(
          authorDid,
          hasExplicitByline(docRecord, authorDid)
            ? getBylineDids(docRecord, authorDid)
            : [],
        ),
      )) ?? undefined;

    await broadcastPostEmail(run, {
      publicationUri: publication_uri,
      authorDid,
      sender: sender.value,
      postTitle,
      postDescription: docRecord?.description,
      postUrl:
        pubRecord?.url && docRecord?.path
          ? `${pubRecord.url.replace(/\/$/, "")}${docRecord.path}`
          : sender.value.pubProps.publicationUrl,
      authorName,
      publishedAtLabel: docRecord?.publishedAt
        ? new Date(docRecord.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : undefined,
      blocks,
      pages,
      rootCanvas,
      recipients,
      eventMetadata: { wider_release_document: document_uri },
      widerReleaseNote: {
        upgradeUrl: `${sender.value.pubProps.publicationUrl.replace(/\/$/, "")}/membership`,
      },
    });

    return { pds, emailed: recipients.length };
  },
);

async function writeFullPdsCopy(
  documentUri: string,
  data: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const uri = new AtUri(documentUri);
    const record = data as { $type?: unknown } | null;
    if (!record || typeof record.$type !== "string")
      return { ok: false, error: "no_record" };
    const session = await restoreOAuthSession(uri.host);
    if (!session.ok) return { ok: false, error: session.error.message };
    const agent = new AtpBaseClient(
      session.value.fetchHandler.bind(session.value),
    );
    await agent.com.atproto.repo.putRecord({
      repo: uri.host,
      collection: uri.collection,
      rkey: uri.rkey,
      record: await documentRecordForPDS(record as { $type: string }, agent),
      validate: false,
    });
    return { ok: true };
  } catch (e) {
    console.error("[wider_release_post] PDS write failed", documentUri, e);
    return { ok: false, error: String(e).slice(0, 500) };
  }
}
