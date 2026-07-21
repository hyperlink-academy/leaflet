# Plan: Leaflet AI Agent API

## Context

LLM agents need a way to read and modify leaflet documents programmatically. This API provides simple REST endpoints authenticated via permission tokens, under a dedicated `/api/ai/` path separate from the existing `/api/rpc/` routes.

---

## Page Model (Important)

The root entity has a **single** `root/page` ordered-reference pointing to the main page entity. That page contains blocks via `card/block` ordered-references. Some blocks have type `card` with a `block/card` reference to another page entity (a subpage). Subpages are opened by navigating from card blocks -- they're not siblings of the root page.

So the hierarchy is: `root_entity → (root/page) → main_page → blocks → [card block → subpage → blocks → ...]`

The API defaults to the main page. Subpages appear as titled references in the markdown output. Agents can request a specific subpage by entity ID.

---

## API URL Structure

```
app/api/ai/
  lib.ts                         -- Shared auth, DB queries, YJS utilities
  doc/route.ts                   -- GET: read page as markdown
  search/route.ts                -- GET: search blocks
  blocks/route.ts                -- POST: add new blocks
  blocks/[blockId]/route.ts      -- PATCH: edit block text, DELETE: remove block
```

**Authentication**: `Authorization: Bearer <token-uuid>` header on all requests.

---

## File 1: `app/api/ai/lib.ts` -- Shared utilities

### Auth: `authenticateToken(request)`
- Extract token UUID from `Authorization: Bearer` header
- Query `permission_tokens` + `permission_token_rights` via Supabase client
- Return `{ tokenId, rootEntity, tokenRights, permissionSet }` or 401
- `permissionSet`: first entity_set with write=true

### Page resolution: `resolvePageEntity(rootEntity, pageParam?)`
- Query facts via Supabase: `entity=rootEntity, attribute='root/page'` → get `[0].data.value` as main page
- If `pageParam` provided: verify it exists as a page entity in this document, return it
- Otherwise return the main page entity ID

### Block fetching: `getPageBlocks(pageEntity)` → `Block[]`
Server-side version of `getBlocksWithTypeLocal` from `src/replicache/getBlocks.ts`:
- Query `card/block` facts for the page via Supabase, sort by `data.position`
- For each block: get `block/type`, handle list blocks recursively (same logic as `getBlocksWithTypeLocal`)
- Return array matching the `Block` type from `components/Blocks/Block.tsx`

### Block-to-HTML: `blocksToHTML(blocks, allFacts)`
Server-side version of `getBlocksAsHTML` from `src/utils/getBlocksAsHTML.tsx`:
- Reuse the same `BlockTypeToHTML` rendering logic but reading from pre-fetched facts instead of Replicache `scanIndex`
- Uses `RenderYJSFragment` + `renderToStaticMarkup` for text/heading/blockquote
- For `card` (subpage) blocks: render as `<a href="subpage:entityId">Subpage Title</a>` (extracting title from the subpage's first heading)
- Uses `parseBlocksToList` from `src/utils/parseBlocksToList.ts` for list structure

### Blocks-to-markdown: `blocksToMarkdown(blocks, allFacts)`
- Call `blocksToHTML()` to get HTML array
- Join with `\n` and convert via `htmlToMarkdown()` from `src/htmlMarkdownParsers.ts`
- This reuses the exact same copy-to-clipboard conversion pipeline (`copySelection.ts`)

### YJS plaintext extraction: `extractPlaintext(base64Value)`
Reuse established pattern (e.g., `app/[leaflet_id]/page.tsx:143`):
```typescript
let doc = new Y.Doc();
Y.applyUpdate(doc, base64.toByteArray(base64Value));
let nodes = doc.getXmlElement("prosemirror").toArray();
return YJSFragmentToString(nodes[0]);
```
Uses `YJSFragmentToString` from `src/utils/yjsFragmentToString.ts`.

### YJS text creation: `createYjsText(plaintext)`
Create Y.js doc matching ProseMirror's expected XML structure:
```typescript
let doc = new Y.Doc();
let fragment = doc.getXmlFragment("prosemirror");  // matches mountProsemirror.ts:328
let paragraph = new Y.XmlElement("paragraph");
let textNode = new Y.XmlText();
textNode.insert(0, plaintext);
paragraph.insert(0, [textNode]);
fragment.insert(0, [paragraph]);
return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
```

### YJS text editing: `editYjsText(existingBase64, operation)`

Operations:
- `{ type: "replace", content: string }` -- replace full text
- `{ type: "insert", position: "start" | "end", content: string }`
- `{ type: "insert", position: { before: string } | { after: string }, content: string }`

Implementation:
1. Create Y.Doc, apply existing state via `Y.applyUpdate`
2. Get XmlElement, navigate to the paragraph's XmlText child
3. Get plaintext via `toDelta()` to find character offsets
4. For `replace`: delete(0, length), insert(0, content)
5. For `insert` at `start`/`end`: insert at offset 0 or text.length
6. For `before`/`after` string: find offset in plaintext, insert at offset or offset+search.length
7. If search string not found: return `{ error: "search_not_found", fullText }`
8. Return base64 of `Y.encodeStateAsUpdate(doc)`

### Realtime poke: `broadcastPoke(rootEntity)`
Pattern from `push.ts:170-174`:
```typescript
let channel = supabase.channel(`rootEntity:${rootEntity}`);
await channel.send({ type: "broadcast", event: "poke", payload: { message: "poke" } });
await supabase.removeChannel(channel);
```

---

## File 2: `app/api/ai/doc/route.ts` -- Read Page as Markdown

**`GET /api/ai/doc?page=<pageEntityId>`**

1. Authenticate token
2. Resolve page entity (main page or specified subpage)
3. Fetch blocks via `getPageBlocks()`
4. Convert to markdown via `blocksToMarkdown()`
5. Find all `card` type blocks to list subpages with titles and IDs

Response:
```json
{
  "title": "Document Title",
  "markdown": "# Heading\n\nParagraph text...\n\n[Subpage Title](subpage:entity-id)",
  "subpages": [{ "id": "entity-uuid", "title": "Page Title" }]
}
```

Subpages appear inline in the markdown where the card block is, as links. The `subpages` array also lists them separately for easy lookup.

---

## File 3: `app/api/ai/search/route.ts` -- Search Blocks

**`GET /api/ai/search?q=<query>&page=<pageEntityId>`**

1. Authenticate token
2. Resolve page (defaults to main page)
3. Get all blocks for the page
4. For text-bearing blocks: extract plaintext and case-insensitive substring match
5. For code blocks: search `block/code` string directly

Response:
```json
{
  "results": [
    { "blockId": "uuid", "type": "text", "text": "Full block text" }
  ]
}
```

---

## File 4: `app/api/ai/blocks/route.ts` -- Add Blocks

**`POST /api/ai/blocks`**

Request:
```json
{
  "page": "page-entity-id (optional)",
  "position": "start" | "end" | { "after": "block-id" } | { "before": "block-id" },
  "blocks": [
    { "type": "text", "content": "Hello world" },
    { "type": "heading", "content": "Title", "level": 2 },
    { "type": "code", "content": "console.log('hi')", "language": "js" },
    { "type": "horizontal-rule" }
  ]
}
```

1. Authenticate token, verify write access
2. Resolve page entity
3. Open DB transaction via `pool.connect()` + `drizzle(client)`
4. Acquire advisory lock: `SELECT pg_advisory_xact_lock(<tokenHash>)` (same hash as `push.ts` — serializes with Replicache pushes)
5. Get existing blocks to compute positions (inside transaction, after lock)
6. Use `cachedServerMutationContext(tx, tokenId, tokenRights)` 
7. For each block:
   - `v7()` for new entity ID and fact ID
   - Compute position with `generateKeyBetween` based on anchor and neighbors
   - Call `addBlock` mutation from `src/replicache/mutations.ts`
   - Assert text content via `createYjsText()`, heading level, code content, etc.
   - Chain positions: each subsequent block goes after the previous
8. `flush()` the cached context
9. Broadcast poke

**Position computation**:
- `"start"`: `generateKeyBetween(null, firstBlock?.position)`
- `"end"`: `generateKeyBetween(lastBlock?.position, null)`
- `{ "after": id }`: `generateKeyBetween(targetBlock.position, nextBlock?.position)`
- `{ "before": id }`: `generateKeyBetween(prevBlock?.position, targetBlock.position)`

Response:
```json
{ "blocks": [{ "blockId": "new-uuid", "type": "text" }] }
```

---

## File 5: `app/api/ai/blocks/[blockId]/route.ts` -- Edit & Delete Block

**`DELETE /api/ai/blocks/<blockId>`**

1. Authenticate token, verify write access
2. Open DB transaction via `pool.connect()` + `drizzle(client)`
3. Acquire advisory lock: `SELECT pg_advisory_xact_lock(<tokenHash>)`
4. Verify block entity exists and belongs to permitted entity_set
5. Call `ctx.deleteEntity(blockEntity)` — this retracts all facts for the entity (block/type, block/text, card/block reference, etc.)
6. If the block has a `block/image` fact, clean up the storage object via `supabase.storage.from("minilink-user-assets").remove(...)` and clear any `cover_image` references (same logic as `removeBlock` in `src/replicache/mutations.ts`)
7. Broadcast poke

Response:
```json
{ "deleted": "block-uuid" }
```

404 if block not found or not in permitted entity_set.

---

**`PATCH /api/ai/blocks/<blockId>`**

Request:
```json
{
  "action": "replace" | "insert",
  "content": "text to insert or replace with",
  "position": "start" | "end" | { "before": "search" } | { "after": "search" }
}
```

1. Authenticate token, verify write access
2. Open DB transaction via `pool.connect()` + `drizzle(client)`
3. Acquire advisory lock: `SELECT pg_advisory_xact_lock(<tokenHash>)` (same hash as `push.ts` — serializes with Replicache pushes and other AI API writes)
4. Verify block entity exists and belongs to permitted entity_set
5. Read block type
6. **For text/heading/blockquote** (YJS content):
   - Read existing `block/text` fact (inside transaction, after lock)
   - Call `editYjsText(existingBase64, operation)`
   - If search not found: return 400 with `{ error: "search_not_found", blockText: "..." }`
   - Write new base64 directly to facts table via Drizzle UPDATE
7. **For code blocks** (plain string):
   - Read `block/code` fact, perform string manipulation, update fact
8. Broadcast poke

**Why advisory lock + direct UPDATE**: The lock serializes this endpoint with Replicache pushes (which use the same token-hash lock in `push.ts`). Since we read→modify→write the full YJS state while holding the lock, no concurrent write can interleave — direct UPDATE is safe. We don't need `assertFact`'s `Y.mergeUpdates` because the lock guarantees we're working on the latest state.

Success response:
```json
{ "blockId": "uuid", "newText": "full updated text" }
```

Error response (search not found):
```json
{ "error": "search_not_found", "blockText": "the actual full text so agent can retry" }
```

---

## File 6: `.claude/skills/leaflet-ai-api/SKILL.md` -- Agent Skill

Non-user-invocable skill describing how agents use the API.

Key sections:
- **URL extraction**: How to get the token from `leaflet.pub/<token>` URLs
- **Authentication**: `Authorization: Bearer <token>` header
- **Endpoint reference**: All endpoints with request/response formats
- **Reading pattern**: Read doc first to understand structure, note subpage IDs
- **Update pattern**: Read → Search → Edit/Delete loop
  1. Read the document to understand structure
  2. Search for specific content to find block IDs
  3. Make targeted edits using block IDs + search strings for precise positioning, or delete blocks that should be removed
  4. **Verification**: After each edit, re-read the document or search for the block to confirm the edit was applied correctly. If `search_not_found` error occurs, use the returned `blockText` to adjust the search string and retry.
- **Subagent recommendation**: Strongly encourage agents to delegate the mechanical read→edit→verify loop to a subagent. The main agent decides WHAT to change, the subagent handles the API calls and verification. This prevents API responses from polluting the main conversation context.
- **Example subagent prompt template** included in the skill

---

## Key Existing Code to Reuse

| File | What |
|------|------|
| `src/utils/yjsFragmentToString.ts` | `YJSFragmentToString()` |
| `src/htmlMarkdownParsers.ts` | `htmlToMarkdown()` for blocks→markdown |
| `src/utils/getBlocksAsHTML.tsx` | `BlockTypeToHTML` rendering patterns |
| `src/utils/parseBlocksToList.ts` | `parseBlocksToList()` for list structure |
| `src/replicache/mutations.ts` | `addBlock` mutation |
| `src/replicache/cachedServerMutationContext.ts` | Write transaction context |
| `src/replicache/getBlocks.ts` | `getBlocksWithTypeLocal` block fetching pattern |
| `components/Blocks/TextBlock/RenderYJSFragment.tsx` | `RenderYJSFragment` for HTML rendering |
| `drizzle/schema.ts` | Table definitions (write endpoints only) |
| `supabase/pool.ts` | DB connection pool (write endpoints only) |

## Implementation Order

1. `app/api/ai/lib.ts`
2. `app/api/ai/doc/route.ts`
3. `app/api/ai/search/route.ts`
4. `app/api/ai/blocks/route.ts`
5. `app/api/ai/blocks/[blockId]/route.ts`
6. `.claude/skills/leaflet-ai-api/SKILL.md`

## Verification

1. `npm run dev`
2. Get a test token UUID from the browser URL
3. Test each endpoint with curl:
   - `curl -H "Authorization: Bearer <token>" localhost:3000/api/ai/doc`
   - `curl -H "Authorization: Bearer <token>" "localhost:3000/api/ai/search?q=hello"`
   - `curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"position":"end","blocks":[{"type":"text","content":"Test"}]}' localhost:3000/api/ai/blocks`
   - `curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"action":"insert","position":"end","content":" appended"}' localhost:3000/api/ai/blocks/<blockId>`
   - `curl -X DELETE -H "Authorization: Bearer <token>" localhost:3000/api/ai/blocks/<blockId>`
4. Verify edits appear in the leaflet UI in real-time
