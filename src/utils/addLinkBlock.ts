import {
  LinkPreviewBody,
  LinkPreviewImageResult,
  LinkPreviewMetadataResult,
} from "app/api/link_previews/route";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { AtpAgent } from "@atproto/api";
import { v7 } from "uuid";
import { getAspectRatio } from "src/utils/aspectRatio";

export async function assertStandardSitePostFacts(
  rep: Replicache<ReplicacheMutators>,
  entityID: string,
  uri: string,
  ignoreUndo?: boolean,
) {
  let facts: Parameters<typeof rep.mutate.assertFact>[0] & {
    ignoreUndo?: true;
  } = [
    {
      entity: entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "standard-site-post" },
    },
    {
      entity: entityID,
      attribute: "block/standard-site-post",
      data: { type: "string", value: uri },
    },
  ];
  if (ignoreUndo) facts.ignoreUndo = true;
  await rep.mutate.assertFact(facts);
}

export async function assertStandardSitePublicationFacts(
  rep: Replicache<ReplicacheMutators>,
  entityID: string,
  uri: string,
  ignoreUndo?: boolean,
) {
  let facts: Parameters<typeof rep.mutate.assertFact>[0] & {
    ignoreUndo?: true;
  } = [
    {
      entity: entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "standard-site-publication" },
    },
    {
      entity: entityID,
      attribute: "block/standard-site-publication",
      data: { type: "string", value: uri },
    },
  ];
  if (ignoreUndo) facts.ignoreUndo = true;
  await rep.mutate.assertFact(facts);
}

export async function addLinkBlock(
  url: string,
  entityID: string,
  rep?: Replicache<ReplicacheMutators> | null,
  ignoreUndo?: boolean,
) {
  if (!rep) return;
  let r = rep;
  // The bulk-paste undo group already reverts these entities wholesale, so
  // callers there pass ignoreUndo to keep async link enrichment from adding a
  // stray undo step on top.
  let assert = (
    facts: Parameters<typeof r.mutate.assertFact>[0] & { ignoreUndo?: true },
  ) => {
    if (ignoreUndo) facts.ignoreUndo = true;
    return r.mutate.assertFact(facts);
  };

  let res = await fetch("/api/link_previews", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ url, type: "meta" } as LinkPreviewBody),
  });
  if (res.status !== 200) {
    await assert([
      {
        entity: entityID,
        attribute: "link/url",
        data: {
          type: "string",
          value: url,
        },
      },
      {
        entity: entityID,
        attribute: "block/type",
        data: { type: "block-type-union", value: "link" },
      },
    ]);
    return;
  }
  let data = await (res.json() as LinkPreviewMetadataResult);

  if (data.leafletPost) {
    await assertStandardSitePostFacts(
      rep,
      entityID,
      data.leafletPost.uri,
      ignoreUndo,
    );
    return;
  }

  if (data.leafletPublication) {
    await assertStandardSitePublicationFacts(
      rep,
      entityID,
      data.leafletPublication.uri,
      ignoreUndo,
    );
    return;
  }

  if (data.blueskyPost) {
    let host = "bsky.app";
    try {
      host = new URL(url).host;
    } catch {}
    let success = await assertBlueskyPostFacts(
      data.blueskyPost.uri,
      host,
      entityID,
      rep,
      ignoreUndo,
    );
    if (success) return;
  }

  if (!data.success) {
    await assert([
      {
        entity: entityID,
        attribute: "link/url",
        data: {
          type: "string",
          value: url,
        },
      },
      {
        entity: entityID,
        attribute: "block/type",
        data: { type: "block-type-union", value: "link" },
      },
    ]);
    return;
  }

  if (data.data.links?.player?.[0]) {
    let embed = data.data.links?.player?.[0];
    let facts: Parameters<typeof rep.mutate.assertFact>[0] = [
      {
        entity: entityID,
        attribute: "block/type",
        data: { type: "block-type-union", value: "embed" },
      },
      {
        entity: entityID,
        attribute: "embed/url",
        data: {
          type: "string",
          value: embed.href,
        },
      },
    ];
    let aspectRatio = getAspectRatio(embed.media);
    if (aspectRatio) {
      facts.push({
        entity: entityID,
        attribute: "embed/aspect-ratio",
        data: {
          type: "string",
          value: aspectRatio,
        },
      });
    } else {
      facts.push({
        entity: entityID,
        attribute: "embed/height",
        data: {
          type: "number",
          value: embed.media?.height || 300,
        },
      });
    }
    await assert(facts);
    return;
  }
  await assert([
    {
      entity: entityID,
      attribute: "link/url",
      data: {
        type: "string",
        value: url,
      },
    },
    {
      entity: entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "link" },
    },
    {
      entity: entityID,
      attribute: "link/title",
      data: {
        type: "string",
        value: data.data.meta?.title || "",
      },
    },
    {
      entity: entityID,
      attribute: "link/description",
      data: {
        type: "string",
        value: data.data.meta?.description || "",
      },
    },
  ]);
  let imageRes = await fetch("/api/link_previews", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ url, type: "image" } as LinkPreviewBody),
  });

  let image_data = await (imageRes.json() as LinkPreviewImageResult);

  await assert({
    entity: entityID,
    attribute: "link/preview",
    data: {
      fallback: "",
      type: "image",
      src: image_data.url,
      width: image_data.width,
      height: image_data.height,
    },
  });
}

export async function addBlueskyPostBlock(
  url: string,
  entityID: string,
  rep: Replicache<ReplicacheMutators>,
) {
  //construct bsky post uri from url
  let urlParts = url?.split("/");
  let host = urlParts ? urlParts[2] : "bsky.app"; // "bsky.app", "blacksky.community", "witchsky.app", etc.
  let userDidOrHandle = urlParts ? urlParts[4] : ""; // "schlage.town" or "did:plc:jjsc5rflv3cpv6hgtqhn2dcm"
  let collection = "app.bsky.feed.post";
  let postId = urlParts ? urlParts[6] : "";
  let uri = `at://${userDidOrHandle}/${collection}/${postId}`;

  return assertBlueskyPostFacts(uri, host, entityID, rep);
}

export async function assertBlueskyPostFacts(
  uri: string,
  host: string,
  entityID: string,
  rep: Replicache<ReplicacheMutators>,
  ignoreUndo?: boolean,
) {
  let post = await getBlueskyPost(uri);
  if (!post || post === undefined) return false;

  let facts: Parameters<typeof rep.mutate.assertFact>[0] & {
    ignoreUndo?: true;
  } = [
    {
      entity: entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "bluesky-post" },
    },
    {
      entity: entityID,
      attribute: "block/bluesky-post",
      data: {
        type: "bluesky-post",
        //TODO: this is a hack to get rid of a nested Array buffer which cannot be frozen, which replicache does on write.
        value: JSON.parse(JSON.stringify(post.data.thread)),
      },
    },
    {
      entity: entityID,
      attribute: "bluesky-post/host",
      data: {
        type: "string",
        value: host,
      },
    },
  ];
  if (ignoreUndo) facts.ignoreUndo = true;
  await rep.mutate.assertFact(facts);
  return true;
}
async function getBlueskyPost(uri: string) {
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
  try {
    let blueskyPost = await agent
      .getPostThread({
        uri: uri,
        depth: 0,
        parentHeight: 0,
      })
      .then((res) => {
        return res;
      });
    return blueskyPost;
  } catch (error) {
    let rect = document;
    return;
  }
}
