import { AtUri } from "@atproto/syntax";
import { supabaseServerClient } from "supabase/serverClient";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";

// Debug page: lists publications with more than 10 subscribers and links to
// their /subscribe/[did]/[rkey] pages.
export default async function DebugSubscribePages() {
  const { data: publications } = await supabaseServerClient
    .from("publications")
    .select(`uri, identity_did, record, publication_subscriptions(count)`);

  const rows = (publications ?? [])
    .map((p) => {
      const count = p.publication_subscriptions?.[0]?.count ?? 0;
      const record = normalizePublicationRecord(p.record);
      let rkey: string | null = null;
      try {
        rkey = new AtUri(p.uri).rkey;
      } catch {
        rkey = null;
      }
      return {
        uri: p.uri,
        did: p.identity_did,
        rkey,
        count,
        name: record?.name ?? p.uri,
      };
    })
    .filter((r) => r.count > 10 && r.rkey)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-3">
      <h1 className="text-xl font-bold">
        Publications with &gt; 10 subscribers ({rows.length})
      </h1>
      {rows.length === 0 ? (
        <p className="text-tertiary">No publications match.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.uri} className="flex flex-row gap-2 items-baseline">
              <span className="text-tertiary tabular-nums w-12 shrink-0">
                {r.count}
              </span>
              <a
                href={`/subscribe/${encodeURIComponent(r.did)}/${encodeURIComponent(
                  r.rkey!,
                )}`}
                className="text-accent-contrast underline"
              >
                {r.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
