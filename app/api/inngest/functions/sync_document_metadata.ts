import { inngest, events } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { AtpAgent, AtUri } from "@atproto/api";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import type { Json } from "supabase/database.types";

// 1m, 2m, 4m, 8m, 16m, 32m, 1h, 2h, 4h, 8h, 8h, 8h (~37h total)
const SLEEP_INTERVALS = [
  "1m", "2m", "4m", "8m", "16m", "32m", "1h", "2h", "4h", "8h", "8h", "8h",
];

export const sync_document_metadata = inngest.createFunction(
  {
    id: "sync_document_metadata_v2",
    debounce: {
      key: "event.data.document_uri",
      period: "60s",
      timeout: "3m",
    },
    concurrency: [{ key: "event.data.document_uri", limit: 1 }],
    triggers: [events.appviewSyncDocumentMetadata],
  },
  async ({ event, step }) => {
    const { document_uri, bsky_post_uri, event_type } = event.data;

    const did = new AtUri(document_uri).host;

    const handleResult = await step.run("resolve-handle", async () => {
      const doc = await idResolver.did.resolve(did);
      const handle = doc?.alsoKnownAs
        ?.find((a) => a.startsWith("at://"))
        ?.replace("at://", "");
      if (!doc) return null;
      const isBridgy = !!doc?.service?.find(
        (s) =>
          typeof s.serviceEndpoint === "string" &&
          s.serviceEndpoint.includes("atproto.brid.gy"),
      );
      return { handle: handle ?? null, isBridgy, doc };
    });
    if (!handleResult) return { error: "No Handle" };

    if (handleResult.isBridgy) {
      await step.run("delete-bridgy-doc", async () => {
        return await supabaseServerClient
          .from("documents")
          .delete()
          .eq("uri", document_uri);
      });
      return { handle: handleResult.handle, deleted: true };
    }

    await step.run("inflate-blob-pages", async () => {
      // If the publisher offloaded pages to a JSON blob (see
      // publishToPublication.ts), fetch the blob, splice it back into
      // content.pages, and drop blobPages so downstream readers can treat
      // documents.data as fully inflated.
      const { data: doc } = await supabaseServerClient
        .from("documents")
        .select("data")
        .eq("uri", document_uri)
        .single();
      if (!doc?.data || typeof doc.data !== "object") return { skipped: true };

      const record = doc.data as Record<string, unknown>;
      if (record.$type !== "site.standard.document") return { skipped: true };
      const content = record.content as Record<string, unknown> | undefined;
      const blobPages = content?.blobPages as
        | { ref?: { $link?: string }; mimeType?: string }
        | undefined;
      if (!content || !blobPages) return { skipped: true };

      const cid = blobPages.ref?.$link;
      if (!cid) return { skipped: true };

      const service = handleResult.doc?.service?.find(
        (f) => f.id === "#atproto_pds",
      );
      if (!service || typeof service.serviceEndpoint !== "string") {
        return { skipped: "no_pds" as const };
      }

      const pdsAgent = new AtpAgent({ service: service.serviceEndpoint });
      const blobResponse = await pdsAgent.com.atproto.sync.getBlob({
        did,
        cid,
      });
      const inflatedPages = JSON.parse(
        new TextDecoder().decode(blobResponse.data),
      );
      if (!Array.isArray(inflatedPages)) {
        return { skipped: "blob_not_array" as const };
      }

      // Strip both blobPages and the top-level `blobs` mirror — after inflation
      // the blob refs live back inside pages, so the mirror would just be
      // duplicate data.
      const { blobPages: _blobPages, blobs: _blobs, ...contentWithoutBlob } =
        content;
      const inflatedRecord = {
        ...record,
        content: {
          ...contentWithoutBlob,
          pages: inflatedPages,
        },
      };

      await supabaseServerClient
        .from("documents")
        .update({ data: inflatedRecord as Json })
        .eq("uri", document_uri);

      return { inflated: true, pageCount: inflatedPages.length };
    });

    await step.run("set-indexed", async () => {
      return await supabaseServerClient
        .from("documents")
        .update({ indexed: true })
        .eq("uri", document_uri)
        .select();
    });

    // Only fire newsletter broadcasts on first-time document creation. An
    // update to an existing post must never trigger a send — otherwise editing
    // an old post after newsletters were enabled would mail subscribers a post
    // they never signed up for.
    if (event_type === "create") {
      const broadcast = await step.run(
        "maybe-claim-newsletter-broadcast",
        async () => {
          const { data: docInPub } = await supabaseServerClient
            .from("documents_in_publications")
            .select("publication")
            .eq("document", document_uri)
            .maybeSingle();
          const publication_uri = docInPub?.publication;
          if (!publication_uri) return { skipped: "no_publication" as const };

          const { data: settings } = await supabaseServerClient
            .from("publication_newsletter_settings")
            .select("enabled")
            .eq("publication", publication_uri)
            .maybeSingle();
          if (!settings?.enabled) {
            return { skipped: "newsletter_not_enabled" as const };
          }

          const { data: inserted } = await supabaseServerClient
            .from("publication_post_sends")
            .upsert(
              {
                publication: publication_uri,
                document: document_uri,
                status: "pending",
              },
              { onConflict: "publication,document", ignoreDuplicates: true },
            )
            .select();
          if (!inserted || inserted.length === 0) {
            return { skipped: "already_sent_or_pending" as const };
          }
          return { claimed: true as const, publication_uri };
        },
      );

      if ("claimed" in broadcast) {
        await step.sendEvent("send-newsletter-broadcast", {
          name: "newsletter/post.send.requested",
          data: {
            publication_uri: broadcast.publication_uri,
            document_uri,
          },
        });
      }
    }

    if (!bsky_post_uri) {
      return { handle: handleResult.handle };
    }

    const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

    const fetchAndUpdate = async () => {
      const res = await agent.app.bsky.feed.getPosts({
        uris: [bsky_post_uri],
      });
      const post = res.data.posts[0];
      if (!post) return 0;
      const likeCount = post.likeCount ?? 0;
      await supabaseServerClient
        .from("documents")
        .update({ bsky_like_count: likeCount })
        .eq("uri", document_uri);
      return likeCount;
    };

    let likeCount = await step.run("sync-0", fetchAndUpdate);

    for (let i = 0; i < SLEEP_INTERVALS.length; i++) {
      await step.sleep(`wait-${i + 1}`, SLEEP_INTERVALS[i]);
      likeCount = await step.run(`sync-${i + 1}`, fetchAndUpdate);
    }

    return { likeCount, handle: handleResult.handle };
  },
);
