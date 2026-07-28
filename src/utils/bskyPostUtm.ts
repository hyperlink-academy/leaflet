// UTM tagging for links embedded in Bluesky posts we create (publish flow,
// share modal, quote shares). utm_content carries "<did>/<rkey>" so analytics
// can reconstruct the exact post's at-uri and hydrate its content/interactions.

export type BskyUtmCampaign = "publish" | "share" | "quote";

const POST_COLLECTION = "app.bsky.feed.post";

export function addBskyPostUtm(
  url: string,
  args: { did: string; rkey: string; campaign: BskyUtmCampaign },
): string {
  let u = new URL(url);
  u.searchParams.set("utm_source", "bluesky");
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", args.campaign);
  u.searchParams.set("utm_content", bskyPostUtmContent(args.did, args.rkey));
  return u.toString();
}

export function bskyPostUtmContent(did: string, rkey: string): string {
  return `${did}/${rkey}`;
}

// Parse a utm_content value back into the post's at-uri. Returns null for
// anything that doesn't look like "<did>/<rkey>", since utm_content is
// attacker-controlled query-param data by the time it reaches analytics.
export function bskyPostUriFromUtmContent(content: string): string | null {
  let slash = content.indexOf("/");
  if (slash === -1) return null;
  let did = content.slice(0, slash);
  let rkey = content.slice(slash + 1);
  if (!did.startsWith("did:") || !rkey) return null;
  if (rkey.includes("/") || !/^[a-zA-Z0-9._:~-]{1,512}$/.test(rkey))
    return null;
  return `at://${did}/${POST_COLLECTION}/${rkey}`;
}
