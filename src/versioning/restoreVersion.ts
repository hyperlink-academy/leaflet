import * as Y from "yjs";
import * as base64 from "base64-js";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "supabase/pool";
import {
  blob_cleanup_queue,
  document_versions,
  permission_token_rights,
  permission_tokens,
} from "drizzle/schema";
import { supabaseServerClient } from "supabase/serverClient";
import { cachedServerMutationContext } from "src/replicache/cachedServerMutationContext";
import { Attributes, type Attribute } from "src/replicache/attributes";
import { SCHEMA_VERSION } from "components/Blocks/TextBlock/schema";
import {
  closureImagePaths,
  cutVersion,
  getClosureFacts,
  type SnapshotFact,
} from "./cutVersion";

const REFERENCE_TYPES = new Set([
  "reference",
  "ordered-reference",
  "spatial-reference",
]);

function tokenHash(tokenId: string): number {
  return tokenId.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
}

async function broadcastPoke(rootEntity: string) {
  let channel = supabaseServerClient.channel(`rootEntity:${rootEntity}`);
  await channel.send({
    type: "broadcast",
    event: "poke",
    payload: { message: "poke" },
  });
  await supabaseServerClient.removeChannel(channel);
}

function stampSchemaVersion(doc: Y.Doc) {
  let meta = doc.getMap("meta");
  if (((meta.get("schemaVersion") as number | undefined) ?? 0) < SCHEMA_VERSION)
    meta.set("schemaVersion", SCHEMA_VERSION);
}

function stampedEncoding(snapshotB64: string): string {
  let doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(snapshotB64));
  stampSchemaVersion(doc);
  return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
}

function compensatingTextValue(
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

function closureEntities(facts: SnapshotFact[]): Set<string> {
  let s = new Set<string>();
  for (let f of facts) {
    s.add(f.entity);
    if (REFERENCE_TYPES.has((f.data as { type: string }).type))
      s.add((f.data as { value: string }).value);
  }
  return s;
}

export async function restoreDocumentVersion(args: {
  tokenId: string;
  versionId: string;
  authorDid: string | null;
  authorIdentity: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let { tokenId, versionId, authorDid, authorIdentity } = args;
  const client = await pool.connect();
  const db = drizzle(client);
  try {
    let result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${tokenHash(tokenId)})`,
      );

      let [version] = await tx
        .select()
        .from(document_versions)
        .where(
          and(
            eq(document_versions.id, versionId),
            eq(document_versions.token, tokenId),
          ),
        );
      if (!version?.snapshot)
        return { ok: false as const, error: "Version not found" };

      let [tokenRow] = await tx
        .select()
        .from(permission_tokens)
        .where(eq(permission_tokens.id, tokenId));
      if (!tokenRow) return { ok: false as const, error: "Leaflet not found" };
      let rootEntity = tokenRow.root_entity;

      let token_rights = await tx
        .select()
        .from(permission_token_rights)
        .where(eq(permission_token_rights.token, tokenId));
      let entitySet = token_rights.find((r) => r.write)?.entity_set;
      if (!entitySet) return { ok: false as const, error: "No write access" };

      let currentFacts = await getClosureFacts(tx, rootEntity);
      await cutVersion(tx, {
        tokenId,
        rootEntity,
        kind: "pre_restore",
        authorDid,
        authorIdentity,
        facts: currentFacts,
      });

      let snapshotFacts = version.snapshot as SnapshotFact[];

      let { getContext, flush } = cachedServerMutationContext(
        tx,
        tokenId,
        token_rights,
        authorDid,
        rootEntity,
        { trustedAuthorWrites: true },
      );
      let ctx = getContext("version-restore", 0);
      let assertSnapshotFact = (
        fact: SnapshotFact,
        data = fact.data,
        id: string | undefined = fact.id,
      ) =>
        ctx.assertFact({
          id,
          entity: fact.entity,
          attribute: fact.attribute,
          data,
          author_did: fact.author_did,
        } as Parameters<typeof ctx.assertFact>[0]);

      let snapshotEntities = closureEntities(snapshotFacts);
      let currentEntities = closureEntities(currentFacts);

      for (let e of snapshotEntities)
        await ctx.createEntity({ entityID: e, permission_set: entitySet });
      for (let e of currentEntities)
        if (!snapshotEntities.has(e)) await ctx.deleteEntity(e);

      let currentById = new Map(currentFacts.map((f) => [f.id, f]));
      let currentByEA = new Map<string, SnapshotFact>();
      for (let f of currentFacts) {
        let attr = Attributes[f.attribute as Attribute];
        if (attr?.cardinality !== "one") continue;
        let key = `${f.entity}|${f.attribute}`;
        if (!currentByEA.has(key)) currentByEA.set(key, f);
      }

      let matchedCurrentIds = new Set<string>();
      let seenOneKeys = new Set<string>();
      for (let sf of snapshotFacts) {
        let attr = Attributes[sf.attribute as Attribute];
        if (!attr) continue;
        if (attr.cardinality === "one") {
          let key = `${sf.entity}|${sf.attribute}`;
          if (seenOneKeys.has(key)) continue;
          seenOneKeys.add(key);
          let cur = currentByEA.get(key);
          if (cur) {
            matchedCurrentIds.add(cur.id);
            if (JSON.stringify(cur.data) === JSON.stringify(sf.data)) continue;
            if (attr.type === "text") {
              let value: string | null;
              try {
                value = compensatingTextValue(
                  (cur.data as { value: string }).value,
                  (sf.data as { value: string }).value,
                );
              } catch {
                value = stampedEncoding((sf.data as { value: string }).value);
              }
              if (value === null) continue;
              await assertSnapshotFact(sf, { type: "text", value }, undefined);
            } else {
              await assertSnapshotFact(sf, sf.data, undefined);
            }
          } else {
            let data = sf.data;
            if (attr.type === "text")
              data = {
                ...(data as { type: "text"; value: string }),
                value: stampedEncoding((data as { value: string }).value),
              } as SnapshotFact["data"];
            await assertSnapshotFact(sf, data);
          }
        } else {
          let cur = currentById.get(sf.id);
          if (cur) {
            matchedCurrentIds.add(sf.id);
            if (JSON.stringify(cur.data) === JSON.stringify(sf.data)) continue;
          }
          await assertSnapshotFact(sf);
        }
      }

      for (let cf of currentFacts) {
        if (matchedCurrentIds.has(cf.id)) continue;
        if (!snapshotEntities.has(cf.entity)) continue;
        await ctx.retractFact(cf.id);
      }

      let snapshotPaths = new Set(closureImagePaths(snapshotFacts));
      let removedPaths = closureImagePaths(currentFacts).filter(
        (p) => !snapshotPaths.has(p),
      );
      if (removedPaths.length > 0)
        await tx
          .insert(blob_cleanup_queue)
          .values(removedPaths.map((path) => ({ path })))
          .onConflictDoNothing();

      await flush();
      return {
        ok: true as const,
        rootEntity,
      };
    });

    if (result.ok) {
      await broadcastPoke(result.rootEntity);
      return { ok: true };
    }
    return result;
  } finally {
    client.release();
  }
}
