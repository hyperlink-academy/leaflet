type Result = { uri: string; name: string; href?: string };

export async function wikipedia(search: string, limit: number): Promise<Result[]> {
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

  return titles.map((title, i) => ({
    uri: urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    name: title,
    href: urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  }));
}
