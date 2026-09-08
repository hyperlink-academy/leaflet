import { AtUri } from "@atproto/syntax";
import { TID } from "@atproto/common";

// A publication Leaflet created and manages (either record namespace), as
// opposed to one only indexed from the firehose: Leaflet mints TID rkeys, and
// third-party sites mark themselves via preferences or a foreign theme type.
export function isLeafletManagedPublication(p: {
  uri: string;
  record: unknown;
}): boolean {
  try {
    const rkey = new AtUri(p.uri).rkey;
    if (!TID.is(rkey)) return false;
  } catch {
    return false;
  }

  const record = p.record as Record<string, any> | null;
  if (!record) return true;

  if (record.preferences?.greengale) return false;

  if (
    record.theme &&
    record.theme.$type &&
    record.theme.$type !== "pub.leaflet.publication#theme"
  )
    return false;

  return true;
}
