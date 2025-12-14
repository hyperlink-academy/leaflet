"use server";

import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { AtpBaseClient, PubLeafletLinkPost } from "lexicons/api";
import { Agent as BskyAgent } from "@atproto/api";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";

export interface LinkItem {
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface LinkPostInput {
  title?: string;
  description?: string;
  links: LinkItem[];
  tags?: string[];
  via?: {
    type: "bsky-post" | "bsky-posts" | "import";
    uris?: string[];
  };
}

export async function createLinkPost(input: LinkPostInput) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  if (!input.links || input.links.length === 0) {
    throw new Error("At least one link is required");
  }

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  const linkItems: PubLeafletLinkPost.LinkItem[] = input.links.map((link) => ({
    $type: "pub.leaflet.link.post#linkItem",
    url: link.url,
    ...(link.title && { title: link.title }),
    ...(link.description && { description: link.description }),
    ...(link.tags && link.tags.length > 0 && { tags: link.tags }),
  }));

  const record: PubLeafletLinkPost.Record = {
    $type: "pub.leaflet.link.post",
    links: linkItems,
    createdAt: new Date().toISOString(),
    ...(input.title && { title: input.title }),
    ...(input.description && { description: input.description }),
    ...(input.tags && input.tags.length > 0 && { tags: input.tags }),
    ...(input.via && { via: { $type: "pub.leaflet.link.post#viaRef", ...input.via } }),
  };

  const result = await agent.pub.leaflet.link.post.create(
    { repo: credentialSession.did! },
    record,
  );

  return {
    uri: result.uri,
    cid: result.cid,
  };
}

export async function deleteLinkPost(uri: string) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Extract rkey from uri
  const parts = uri.split("/");
  const rkey = parts[parts.length - 1];

  await agent.pub.leaflet.link.post.delete({
    repo: credentialSession.did!,
    rkey,
  });

  return { success: true };
}

export async function getMyLinkPosts(limit = 50, cursor?: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  const query = supabaseServerClient
    .from("link_posts")
    .select("*")
    .eq("author_did", identity.atp_did)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    posts: data || [],
    cursor: data && data.length === limit ? data[data.length - 1]?.created_at : undefined,
  };
}

export async function getAllLinkPosts(limit = 50, cursor?: string) {
  const query = supabaseServerClient
    .from("link_posts")
    .select("*, bsky_profiles!link_posts_author_did_fkey(did, handle, record)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    posts: data || [],
    cursor: data && data.length === limit ? data[data.length - 1]?.created_at : undefined,
  };
}

export async function getFollowedLinkPosts(limit = 50, cursor?: string) {
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  const { data, error } = await supabaseServerClient.rpc("get_followed_link_posts", {
    viewer_did: identity.atp_did,
    page_limit: limit,
    cursor_timestamp: cursor || null,
  });

  if (error) throw error;

  return {
    posts: data || [],
    cursor: data && data.length === limit ? data[data.length - 1]?.created_at : undefined,
  };
}

export async function getRandomLinks(limit = 10, tag?: string) {
  const { data, error } = await supabaseServerClient.rpc("get_random_links", {
    page_limit: limit,
    tag_filter: tag || null,
  });

  if (error) throw error;

  return {
    links: data || [],
  };
}

export async function getLinkPostsByTag(tag: string, limit = 50, cursor?: string) {
  const { data, error } = await supabaseServerClient.rpc("get_link_posts_by_tag", {
    tag_name: tag,
    page_limit: limit,
    cursor_timestamp: cursor || null,
  });

  if (error) throw error;

  return {
    posts: data || [],
    cursor: data && data.length === limit ? data[data.length - 1]?.created_at : undefined,
  };
}

export async function getLinkTags(search = "") {
  const { data, error } = await supabaseServerClient.rpc("search_link_tags", {
    search_query: search,
  });

  if (error) throw error;

  return data || [];
}

export async function getLinkPostsByUser(did: string, limit = 50, cursor?: string) {
  const query = supabaseServerClient
    .from("link_posts")
    .select("*, bsky_profiles!link_posts_author_did_fkey(did, handle, record)")
    .eq("author_did", did)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    posts: data || [],
    cursor: data && data.length === limit ? data[data.length - 1]?.created_at : undefined,
  };
}

export async function getUserProfile(did: string) {
  const { data, error } = await supabaseServerClient
    .from("bsky_profiles")
    .select("did, handle, record")
    .eq("did", did)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  return data;
}

interface BskyLinkPost {
  uri: string;
  text: string;
  createdAt: string;
  links: {
    url: string;
    title?: string;
    description?: string;
  }[];
}

export async function getMyBskyPostsWithLinks(limit = 50): Promise<BskyLinkPost[]> {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let bsky = new BskyAgent(credentialSession);

  const response = await bsky.app.bsky.feed.getAuthorFeed({
    actor: credentialSession.did!,
    limit,
    filter: "posts_no_replies",
  });

  const postsWithLinks: BskyLinkPost[] = [];

  for (const item of response.data.feed) {
    const post = item.post;
    const record = post.record as any;
    const links: BskyLinkPost["links"] = [];

    // Check for embedded external link
    if (post.embed && post.embed.$type === "app.bsky.embed.external#view") {
      const external = (post.embed as any).external;
      if (external?.uri) {
        links.push({
          url: external.uri,
          title: external.title,
          description: external.description,
        });
      }
    }

    // Check for link facets in text
    if (record.facets) {
      for (const facet of record.facets) {
        for (const feature of facet.features || []) {
          if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
            // Avoid duplicates
            if (!links.some((l) => l.url === feature.uri)) {
              links.push({ url: feature.uri });
            }
          }
        }
      }
    }

    if (links.length > 0) {
      postsWithLinks.push({
        uri: post.uri,
        text: record.text || "",
        createdAt: record.createdAt,
        links,
      });
    }
  }

  return postsWithLinks;
}

export async function aggregateBskyLinksToPost(
  postUris: string[],
  title?: string,
  description?: string,
  tags?: string[],
) {
  if (postUris.length === 0) {
    throw new Error("At least one post must be selected");
  }

  // Get the posts with links
  const allPosts = await getMyBskyPostsWithLinks(100);
  const selectedPosts = allPosts.filter((p) => postUris.includes(p.uri));

  if (selectedPosts.length === 0) {
    throw new Error("No valid posts selected");
  }

  // Flatten all links from selected posts
  const links: LinkItem[] = [];
  for (const post of selectedPosts) {
    for (const link of post.links) {
      // Use post text as description if link doesn't have one
      links.push({
        url: link.url,
        title: link.title,
        description: link.description || post.text.slice(0, 300),
      });
    }
  }

  // Remove duplicate URLs, keeping first occurrence
  const uniqueLinks: LinkItem[] = [];
  const seenUrls = new Set<string>();
  for (const link of links) {
    if (!seenUrls.has(link.url)) {
      seenUrls.add(link.url);
      uniqueLinks.push(link);
    }
  }

  // Create the link post
  return createLinkPost({
    title,
    description,
    links: uniqueLinks,
    tags,
    via: {
      type: "bsky-posts",
      uris: postUris,
    },
  });
}
