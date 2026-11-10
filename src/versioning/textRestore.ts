import * as Y from "yjs";
import * as base64 from "base64-js";
import { SCHEMA_VERSION } from "components/Blocks/TextBlock/schema";

function stampSchemaVersion(doc: Y.Doc) {
  let meta = doc.getMap("meta");
  if (((meta.get("schemaVersion") as number | undefined) ?? 0) < SCHEMA_VERSION)
    meta.set("schemaVersion", SCHEMA_VERSION);
}

export function stampedEncoding(snapshotB64: string): string {
  let doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(snapshotB64));
  stampSchemaVersion(doc);
  return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
}

export function compensatingTextValue(
  currentB64: string,
  snapshotB64: string,
): string | null {
  let currentDoc = new Y.Doc();
  Y.applyUpdate(currentDoc, base64.toByteArray(currentB64));
  let snapDoc = new Y.Doc();
  Y.applyUpdate(snapDoc, base64.toByteArray(snapshotB64));
  let current = currentDoc.getXmlElement("prosemirror");
  let snapshot = snapDoc.getXmlElement("prosemirror");
  if (current.toJSON() === snapshot.toJSON()) return null;
  currentDoc.transact(() => {
    current.delete(0, current.length);
    current.insert(
      0,
      snapshot.toArray().map((c) => c.clone()) as (Y.XmlElement | Y.XmlText)[],
    );
  });
  stampSchemaVersion(currentDoc);
  return base64.fromByteArray(Y.encodeStateAsUpdate(currentDoc));
}
