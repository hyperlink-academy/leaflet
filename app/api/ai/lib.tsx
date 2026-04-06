import { createClient } from "@supabase/supabase-js";
import type { Database } from "supabase/database.types";
import { permission_tokens, permission_token_rights } from "drizzle/schema";
import { entities, facts } from "drizzle/schema";
import * as driz from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import { Block } from "components/Blocks/Block";
import { parseBlocksToList, List } from "src/utils/parseBlocksToList";
import { htmlToMarkdown } from "src/htmlMarkdownParsers";

// --- Auth ---

export type AuthResult = {
  tokenId: string;
  rootEntity: string;
  tokenRights: {
    token: string;
    entity_set: string;
    read: boolean;
    write: boolean;
    create_token: boolean;
    change_entity_set: boolean;
  }[];
  permissionSet: string | null;
};

export async function authenticateToken(
  request: Request,
): Promise<AuthResult | Response> {
  let auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }
  let tokenId = auth.slice("Bearer ".length).trim();
  if (!tokenId) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  let supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  let { data: token } = await supabase
    .from("permission_tokens")
    .select("id, root_entity, blocked_by_admin")
    .eq("id", tokenId)
    .single();

  if (!token) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
  if (token.blocked_by_admin) {
    return Response.json({ error: "Token blocked" }, { status: 403 });
  }

  let { data: rights } = await supabase
    .from("permission_token_rights")
    .select("token, entity_set, read, write, create_token, change_entity_set")
    .eq("token", tokenId);

  let tokenRights = rights || [];
  let permissionSet =
    tokenRights.find((r) => r.write)?.entity_set ?? null;

  return {
    tokenId,
    rootEntity: token.root_entity,
    tokenRights,
    permissionSet,
  };
}

// --- Page resolution ---

export async function resolvePageEntity(
  tx: PgTransaction<any, any, any>,
  rootEntity: string,
  pageParam?: string | null,
): Promise<string | Response> {
  let rootPageFacts = await tx
    .select({ data: facts.data })
    .from(facts)
    .where(
      driz.and(
        driz.eq(facts.entity, rootEntity),
        driz.eq(facts.attribute, "root/page"),
      ),
    );

  let mainPage = (rootPageFacts[0]?.data as any)?.value as string | undefined;
  if (!mainPage) {
    return Response.json({ error: "No main page found" }, { status: 404 });
  }

  if (!pageParam) return mainPage;

  // Verify the requested page exists as an entity in this document
  let [pageEntity] = await tx
    .select({ id: entities.id })
    .from(entities)
    .where(driz.eq(entities.id, pageParam));

  if (!pageEntity) {
    return Response.json({ error: "Page not found" }, { status: 404 });
  }

  return pageParam;
}

// --- Block fetching (server-side version of getBlocksWithTypeLocal) ---

type FactRow = {
  id: string;
  entity: string;
  attribute: string;
  data: any;
};

export async function getPageBlocks(
  tx: PgTransaction<any, any, any>,
  pageEntity: string,
): Promise<Block[]> {
  // Get all facts for this page's blocks in bulk
  let blockRefs = await tx
    .select({ id: facts.id, entity: facts.entity, attribute: facts.attribute, data: facts.data })
    .from(facts)
    .where(
      driz.and(
        driz.eq(facts.entity, pageEntity),
        driz.eq(facts.attribute, "card/block"),
      ),
    );

  blockRefs.sort((a, b) => {
    let posA = (a.data as any).position;
    let posB = (b.data as any).position;
    if (posA === posB) return a.id > b.id ? 1 : -1;
    return posA > posB ? 1 : -1;
  });

  if (blockRefs.length === 0) return [];

  // Collect all block entity IDs
  let blockEntityIds = blockRefs.map((r) => (r.data as any).value as string);

  // Fetch all facts for these block entities in one query
  let allBlockFacts = await tx
    .select({ id: facts.id, entity: facts.entity, attribute: facts.attribute, data: facts.data })
    .from(facts)
    .where(driz.inArray(facts.entity, blockEntityIds));

  let factsByEntity = new Map<string, FactRow[]>();
  for (let f of allBlockFacts) {
    let arr = factsByEntity.get(f.entity);
    if (!arr) {
      arr = [];
      factsByEntity.set(f.entity, arr);
    }
    arr.push(f);
  }

  let result: Block[] = [];

  for (let ref of blockRefs) {
    let blockEntityId = (ref.data as any).value as string;
    let blockFacts = factsByEntity.get(blockEntityId) || [];
    let typeFact = blockFacts.find((f) => f.attribute === "block/type");
    if (!typeFact) continue;

    let isListFact = blockFacts.find((f) => f.attribute === "block/is-list");
    if (isListFact && (isListFact.data as any).value) {
      let children = await getListChildren(tx, ref, pageEntity, 1, []);
      result.push(...children);
    } else {
      result.push({
        value: blockEntityId,
        position: (ref.data as any).position,
        factID: ref.id,
        type: (typeFact.data as any).value,
        parent: pageEntity,
      });
    }
  }

  computeDisplayNumbers(result);
  return result;
}

async function getListChildren(
  tx: PgTransaction<any, any, any>,
  root: FactRow,
  pageParent: string,
  depth: number,
  path: { depth: number; entity: string }[],
): Promise<Block[]> {
  let rootValue = (root.data as any).value as string;

  let childRefs = await tx
    .select({ id: facts.id, entity: facts.entity, attribute: facts.attribute, data: facts.data })
    .from(facts)
    .where(
      driz.and(
        driz.eq(facts.entity, rootValue),
        driz.eq(facts.attribute, "card/block"),
      ),
    );
  childRefs.sort((a, b) =>
    (a.data as any).position > (b.data as any).position ? 1 : -1,
  );

  let rootFacts = await tx
    .select({ id: facts.id, entity: facts.entity, attribute: facts.attribute, data: facts.data })
    .from(facts)
    .where(driz.eq(facts.entity, rootValue));

  let typeFact = rootFacts.find((f) => f.attribute === "block/type");
  if (!typeFact) return [];

  let listStyleFact = rootFacts.find((f) => f.attribute === "block/list-style");
  let listNumberFact = rootFacts.find((f) => f.attribute === "block/list-number");

  let newPath = [...path, { entity: rootValue, depth }];

  let childBlocks: Block[] = [];
  for (let c of childRefs) {
    let children = await getListChildren(tx, c, rootValue, depth + 1, newPath);
    childBlocks.push(...children);
  }

  return [
    {
      value: rootValue,
      position: (root.data as any).position,
      factID: root.id,
      type: (typeFact.data as any).value,
      parent: pageParent,
      listData: {
        depth,
        parent: root.entity,
        path: newPath,
        listStyle: listStyleFact ? (listStyleFact.data as any).value : undefined,
        listStart: listNumberFact ? (listNumberFact.data as any).value : undefined,
      },
    },
    ...childBlocks,
  ];
}

function computeDisplayNumbers(blocks: Block[]): void {
  let counters = new Map<string, number>();
  for (let block of blocks) {
    if (!block.listData) {
      counters.clear();
      continue;
    }
    if (block.listData.listStyle !== "ordered") continue;
    let parent = block.listData.parent;
    if (block.listData.listStart !== undefined) {
      counters.set(parent, block.listData.listStart);
    } else if (!counters.has(parent)) {
      counters.set(parent, 1);
    }
    block.listData.displayNumber = counters.get(parent)!;
    counters.set(parent, counters.get(parent)! + 1);
  }
}

// --- Server-side YJS to HTML rendering ---

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderYjsToHTML(
  base64Value: string,
  wrapper: "p" | "h1" | "h2" | "h3" | "blockquote",
  attrs?: Record<string, string>,
): string {
  let attrStr = attrs
    ? Object.entries(attrs)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
        .join("")
    : "";

  if (!base64Value) return `<${wrapper}${attrStr}></${wrapper}>`;

  let doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(base64Value));
  let [node] = doc.getXmlElement("prosemirror").toArray();
  if (!node || node.constructor !== Y.XmlElement) return `<${wrapper}${attrStr}></${wrapper}>`;

  let children = node.toArray();
  if (children.length === 0) return `<${wrapper}${attrStr}><br/></${wrapper}>`;

  let inner = children
    .map((child) => {
      if (child.constructor === Y.XmlText) {
        let deltas = child.toDelta() as { insert: string; attributes?: any }[];
        if (deltas.length === 0) return "<br/>";
        return deltas
          .map((d) => {
            let text = escapeHtml(d.insert);
            if (d.attributes?.link) return `<a href="${escapeHtml(d.attributes.link.href)}">${text}</a>`;
            if (d.attributes?.strong) text = `<strong>${text}</strong>`;
            if (d.attributes?.em) text = `<em>${text}</em>`;
            if (d.attributes?.code) text = `<code>${text}</code>`;
            return text;
          })
          .join("");
      }
      if (child.constructor === Y.XmlElement) {
        if (child.nodeName === "hard_break") return "<br/>";
        if (child.nodeName === "didMention" || child.nodeName === "atMention") {
          let text = child.getAttribute("text") || "";
          return escapeHtml(text);
        }
      }
      return "";
    })
    .join("");

  return `<${wrapper}${attrStr}>${inner}</${wrapper}>`;
}

// --- Block-to-HTML (server-side, reads from pre-fetched facts) ---

export async function getAllFactsForEntities(
  tx: PgTransaction<any, any, any>,
  entityIds: string[],
): Promise<FactRow[]> {
  if (entityIds.length === 0) return [];
  return tx
    .select({ id: facts.id, entity: facts.entity, attribute: facts.attribute, data: facts.data })
    .from(facts)
    .where(driz.inArray(facts.entity, entityIds));
}

function factsLookup(allFacts: FactRow[], entity: string, attribute: string): FactRow[] {
  return allFacts.filter((f) => f.entity === entity && f.attribute === attribute);
}

async function renderBlockToHTML(
  b: Block,
  allFacts: FactRow[],
): Promise<string> {
  let [alignment] = factsLookup(allFacts, b.value, "block/text-alignment");
  let a = alignment ? (alignment.data as any).value : undefined;

  switch (b.type) {
    case "text": {
      let [value] = factsLookup(allFacts, b.value, "block/text");
      return renderYjsToHTML(value?.data.value, "p", a ? { "data-alignment": a } : undefined);
    }
    case "heading": {
      let [value] = factsLookup(allFacts, b.value, "block/text");
      let [headingLevel] = factsLookup(allFacts, b.value, "block/heading-level");
      let wrapper = ("h" + ((headingLevel?.data as any)?.value || 1)) as "h1" | "h2" | "h3";
      return renderYjsToHTML(value?.data.value, wrapper, a ? { "data-alignment": a } : undefined);
    }
    case "blockquote": {
      let [value] = factsLookup(allFacts, b.value, "block/text");
      return renderYjsToHTML(value?.data.value, "blockquote", a ? { "data-alignment": a } : undefined);
    }
    case "code": {
      let [code] = factsLookup(allFacts, b.value, "block/code");
      let [lang] = factsLookup(allFacts, b.value, "block/code-language");
      let langValue = (lang?.data as any)?.value as string | undefined;
      let codeAttr = langValue ? ` class="language-${escapeHtml(langValue)}"` : "";
      return `<pre><code${codeAttr}>${escapeHtml((code?.data as any)?.value || "")}</code></pre>`;
    }
    case "image": {
      let [src] = factsLookup(allFacts, b.value, "block/image");
      if (!src) return "";
      let alignAttr = a ? ` data-alignment="${escapeHtml(a)}"` : "";
      return `<img src="${escapeHtml((src.data as any).src)}"${alignAttr}/>`;
    }
    case "horizontal-rule":
      return "<hr/>";
    case "card": {
      let [card] = factsLookup(allFacts, b.value, "block/card");
      if (!card) return "";
      let cardEntityId = (card.data as any).value;
      let title = await getSubpageTitle(allFacts, cardEntityId);
      return `<a href="subpage:${cardEntityId}">${escapeHtml(title || "Untitled")}</a>`;
    }
    case "link": {
      let [url] = factsLookup(allFacts, b.value, "link/url");
      let [title] = factsLookup(allFacts, b.value, "link/title");
      if (!url) return "";
      return `<a href="${escapeHtml((url.data as any).value)}" target="_blank">${escapeHtml((title?.data as any)?.value || "")}</a>`;
    }
    case "button": {
      let [text] = factsLookup(allFacts, b.value, "button/text");
      let [url] = factsLookup(allFacts, b.value, "button/url");
      if (!text || !url) return "";
      return `<a href="${escapeHtml((url.data as any).value)}">${escapeHtml((text.data as any).value)}</a>`;
    }
    case "math": {
      let [math] = factsLookup(allFacts, b.value, "block/math");
      return `<code>${escapeHtml((math?.data as any)?.value || "")}</code>`;
    }
    default:
      return "";
  }
}

async function getSubpageTitle(
  allFacts: FactRow[],
  cardEntityId: string,
): Promise<string> {
  // Look for card/block children of the subpage to find first heading
  let blockRefs = allFacts
    .filter((f) => f.entity === cardEntityId && f.attribute === "card/block")
    .sort((a, b) => ((a.data as any).position > (b.data as any).position ? 1 : -1));

  if (blockRefs.length === 0) return "";

  let firstBlockId = (blockRefs[0].data as any).value;
  let [textFact] = allFacts.filter(
    (f) => f.entity === firstBlockId && f.attribute === "block/text",
  );

  if (textFact) {
    return extractPlaintext((textFact.data as any).value);
  }
  return "";
}

async function renderListToHTML(l: List, allFacts: FactRow[]): Promise<string> {
  let children = (
    await Promise.all(l.children.map((c) => renderListToHTML(c, allFacts)))
  ).join("\n");

  let checkedFacts = factsLookup(allFacts, l.block.value, "block/check-list");
  let checked = checkedFacts[0];

  let isOrdered = l.children[0]?.block.listData?.listStyle === "ordered";
  let tag = isOrdered ? "ol" : "ul";

  return `<li ${checked ? `data-checked=${(checked.data as any).value}` : ""}>${await renderBlockToHTML(l.block, allFacts)} ${
    l.children.length > 0 ? `<${tag}>${children}</${tag}>` : ""
  }</li>`;
}

export async function blocksToHTML(
  blocks: Block[],
  allFacts: FactRow[],
): Promise<string[]> {
  let result: string[] = [];
  let parsed = parseBlocksToList(blocks);

  for (let pb of parsed) {
    if (pb.type === "block") {
      result.push(await renderBlockToHTML(pb.block, allFacts));
    } else {
      let isOrdered = pb.children[0]?.block.listData?.listStyle === "ordered";
      let tag = isOrdered ? "ol" : "ul";
      let listItems = (
        await Promise.all(
          pb.children.map((c) => renderListToHTML(c, allFacts)),
        )
      ).join("\n");
      result.push(`<${tag}>${listItems}</${tag}>`);
    }
  }
  return result;
}

// --- Blocks-to-markdown ---

export async function blocksToMarkdown(
  blocks: Block[],
  allFacts: FactRow[],
): Promise<string> {
  let htmlParts = await blocksToHTML(blocks, allFacts);
  let html = htmlParts.join("\n");
  return htmlToMarkdown(html);
}

// --- YJS plaintext extraction ---

export function extractPlaintext(base64Value: string): string {
  if (!base64Value) return "";
  let doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(base64Value));
  let nodes = doc.getXmlElement("prosemirror").toArray();
  if (nodes.length === 0) return "";
  return YJSFragmentToString(nodes[0]);
}

// --- YJS text creation ---

export function createYjsText(plaintext: string): string {
  let doc = new Y.Doc();
  let fragment = doc.getXmlFragment("prosemirror");
  let paragraph = new Y.XmlElement("paragraph");
  let textNode = new Y.XmlText();
  textNode.insert(0, plaintext);
  paragraph.insert(0, [textNode]);
  fragment.insert(0, [paragraph]);
  return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
}

// --- YJS text editing ---

export type EditOperation =
  | { type: "replace"; content: string }
  | { type: "insert"; position: "start" | "end"; content: string }
  | { type: "insert"; position: { before: string } | { after: string }; content: string };

export function editYjsText(
  existingBase64: string,
  operation: EditOperation,
): { result: string; plaintext: string } | { error: "search_not_found"; fullText: string } {
  let doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(existingBase64));

  let element = doc.getXmlElement("prosemirror");
  let paragraph = element.toArray()[0];
  if (!paragraph || paragraph.constructor !== Y.XmlElement) {
    return { error: "search_not_found", fullText: "" };
  }

  // Find the XmlText child
  let textNodes = paragraph.toArray();
  let xmlText: Y.XmlText | null = null;
  for (let n of textNodes) {
    if (n.constructor === Y.XmlText) {
      xmlText = n;
      break;
    }
  }

  if (!xmlText) {
    // No text node exists yet, create one for replace/insert
    xmlText = new Y.XmlText();
    paragraph.insert(0, [xmlText]);
  }

  let currentText = (xmlText.toDelta() as { insert: string }[])
    .map((d) => d.insert)
    .join("");

  if (operation.type === "replace") {
    xmlText.delete(0, currentText.length);
    xmlText.insert(0, operation.content);
  } else if (operation.type === "insert") {
    let pos = operation.position;
    if (pos === "start") {
      xmlText.insert(0, operation.content);
    } else if (pos === "end") {
      xmlText.insert(currentText.length, operation.content);
    } else if ("before" in pos) {
      let idx = currentText.indexOf(pos.before);
      if (idx === -1) return { error: "search_not_found", fullText: currentText };
      xmlText.insert(idx, operation.content);
    } else if ("after" in pos) {
      let idx = currentText.indexOf(pos.after);
      if (idx === -1) return { error: "search_not_found", fullText: currentText };
      xmlText.insert(idx + pos.after.length, operation.content);
    }
  }

  let newText = (xmlText.toDelta() as { insert: string }[])
    .map((d) => d.insert)
    .join("");

  return {
    result: base64.fromByteArray(Y.encodeStateAsUpdate(doc)),
    plaintext: newText,
  };
}

// --- Realtime poke ---

export async function broadcastPoke(rootEntity: string) {
  let supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
  let channel = supabase.channel(`rootEntity:${rootEntity}`);
  await channel.send({
    type: "broadcast",
    event: "poke",
    payload: { message: "poke" },
  });
  await supabase.removeChannel(channel);
}

// --- Helpers ---

export function tokenHash(tokenId: string): number {
  return tokenId.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
}

export function hasWriteAccess(auth: AuthResult): boolean {
  return auth.tokenRights.some((r) => r.write);
}
