import type { MentionResult } from "./types";

export async function wikipedia(search: string, limit: number): Promise<MentionResult[]> {
  if (!search.trim()) return [];

  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", search);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  // OpenSearch returns [query, [titles], [descriptions], [urls]]
  const data = (await res.json()) as [string, string[], string[], string[]];
  const titles = data[1] || [];
  const urls = data[3] || [];

  return titles.map((title, i) => {
    const articleUrl = urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    return {
      uri: articleUrl,
      name: title,
      href: articleUrl,
      icon: "https://en.wikipedia.org/static/apple-touch/wikipedia.png",
      embed: {
        src: `https://en.m.wikipedia.org/wiki/${encodeURIComponent(title)}?useskin=minerva`,
        width: 600,
        height: 400,
      },
    };
  });
}
