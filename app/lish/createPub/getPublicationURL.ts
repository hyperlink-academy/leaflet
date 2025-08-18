import { AtUri } from "@atproto/syntax";
import { PubLeafletPublication } from "lexicons/api";
import { isProductionDomain } from "src/utils/isProductionDeployment";
import { Json } from "supabase/database.types";

export function getPublicationURL(pub: {
  uri: string;
  name: string;
  record: Json;
}) {
  let record = pub.record as PubLeafletPublication.Record;
  if (isProductionDomain() && record?.base_path)
    return `https://${record.base_path}`;
  else return getBasePublicationURL(pub);
}

export function getBasePublicationURL(pub: {
  uri: string;
  name: string;
  record: Json;
}) {
  let record = pub.record as PubLeafletPublication.Record;
  let aturi = new AtUri(pub.uri);
  return `/lish/${aturi.host}/${encodeURIComponent(aturi.rkey || record?.name || pub.name)}`;
}
