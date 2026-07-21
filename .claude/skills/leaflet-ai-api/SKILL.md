---
description: How to read and edit Leaflet documents via the AI API. Use when given a leaflet.pub URL or asked to modify a leaflet document programmatically.
user_invocable: false
---

# Leaflet AI Agent API

## URL Extraction

Leaflet URLs look like `leaflet.pub/<token-uuid>`. The token UUID is the authentication token.

## Authentication

All requests require: `Authorization: Bearer <token-uuid>`

The token UUID comes from the leaflet URL.

## Base URL

Use the environment's base URL (e.g., `http://localhost:3000` in dev, or the production URL).

## Endpoints

### Read Document

```
GET /api/ai/doc?page=<optional-page-entity-id>
```

Returns the document as markdown with subpage references.

Response:
```json
{
  "title": "Document Title",
  "markdown": "# Heading\n\nParagraph text...\n\n[Subpage Title](subpage:entity-id)",
  "subpages": [{ "id": "entity-uuid", "title": "Page Title" }]
}
```

- Defaults to the main page
- Pass `page=<entity-id>` to read a specific subpage
- Subpages appear inline in the markdown as `[Title](subpage:id)` links
- The `subpages` array lists them separately for easy lookup

### Search Blocks

```
GET /api/ai/search?q=<query>&page=<optional-page-entity-id>
```

Case-insensitive substring search across text and code blocks.

Response:
```json
{
  "results": [
    { "blockId": "uuid", "type": "text", "text": "Full block text" },
    { "blockId": "uuid", "type": "code", "text": "console.log('hi')", "language": "js" }
  ]
}
```

For code blocks, the `language` field is included when set.

### Add Blocks

```
POST /api/ai/blocks
```

Request:
```json
{
  "page": "page-entity-id (optional)",
  "position": "start" | "end" | { "after": "block-id" } | { "before": "block-id" },
  "blocks": [
    { "type": "text", "content": "Hello world" },
    { "type": "heading", "content": "Title", "level": 2 },
    { "type": "code", "content": "console.log('hi')", "language": "js" },
    { "type": "blockquote", "content": "A quote" },
    { "type": "horizontal-rule" }
  ]
}
```

Response:
```json
{ "blocks": [{ "blockId": "new-uuid", "type": "text" }] }
```

### Edit Block

```
PATCH /api/ai/blocks/<blockId>
```

Request:
```json
{
  "action": "replace" | "insert",
  "content": "text to insert or replace with",
  "position": "start" | "end" | { "before": "search string" } | { "after": "search string" }
}
```

- `action: "replace"` replaces all text in the block
- `action: "insert"` inserts at the specified position
- `position` is required for insert (defaults to "end" if omitted)
- For `before`/`after`: searches for the exact string in the block text

**Code blocks** also accept an optional `language` field to set the syntax language:

```json
{ "action": "replace", "content": "print('hi')", "language": "python" }
```

Or update the language alone without touching content:

```json
{ "language": "typescript" }
```

Pass `"language": null` or `"language": ""` to clear the language. The `language`
field is only valid for code blocks.

Success response:
```json
{ "blockId": "uuid", "newText": "full updated text" }
```

Error response (search string not found):
```json
{ "error": "search_not_found", "blockText": "the actual full text" }
```

Use the returned `blockText` to adjust your search string and retry.

### Delete Block

```
DELETE /api/ai/blocks/<blockId>
```

Response:
```json
{ "deleted": "block-uuid" }
```

## Reading Pattern

1. **Read the document** with `GET /api/ai/doc` to understand structure
2. Note the block IDs from search results, and subpage IDs from the response
3. To read subpages, call `GET /api/ai/doc?page=<subpage-id>`

Code blocks are rendered in the markdown as fenced code blocks with their language:

````
```python
print("hello")
```
````

To get a code block's ID and current language, use search (`GET /api/ai/search?q=<text>`) — the result includes `language` for code matches.

## Update Pattern

1. **Read** the document to understand structure
2. **Search** for specific content to find block IDs: `GET /api/ai/search?q=<text>`
3. **Edit** using block IDs with precise positioning:
   - Use `{ "before": "exact text" }` or `{ "after": "exact text" }` for surgical inserts
   - Use `"replace"` to rewrite a block entirely
4. **Delete** blocks that should be removed
5. **Verify** after each edit by re-reading the document or searching for the block

If you get a `search_not_found` error, use the returned `blockText` to see the actual content and adjust your search string.

## Avoiding Accidental Edits

**Only touch blocks that are directly relevant to the task.** Do not modify, rewrite, or delete any text beyond what is specifically required.

- **Prefer `insert` over `replace`** when adding content to an existing block. `replace` overwrites the entire block — only use it when the whole block text needs to change.
- **Never rewrite a block just to fix formatting, typos, or style** unless that is the explicit task. Preserve the author's existing wording exactly.
- **Double-check block IDs before editing.** Search results may return multiple blocks — confirm you have the right one before sending a PATCH or DELETE.
- **Do not delete blocks unless the task specifically calls for removal.** If you're replacing content, edit the existing block rather than deleting and re-creating it.
- **After each edit, verify the result.** Re-read or search the block to confirm only the intended change was made and no surrounding text was lost or altered.
- **When using `replace`, include all original text that should be preserved.** The replace action overwrites everything in the block — if you only need to change one sentence, use `insert` with `before`/`after` positioning instead, or include the full block text with your change applied.

## Subagent Recommendation

For complex edits, delegate the mechanical read-edit-verify loop to a subagent. The main agent decides WHAT to change; the subagent handles the API calls and verification. This prevents API responses from polluting the main conversation context.

Example subagent prompt:

```
You are editing a Leaflet document via its AI API.

Base URL: <base-url>
Token: <token>

Task: <description of what to change>

IMPORTANT: Only modify the specific content required by the task. Do not alter, reformat, or
rewrite any other text in the document. Prefer "insert" with before/after positioning over
"replace" when possible — replace overwrites the entire block. After each edit, verify that
only the intended change was made and no surrounding text was lost.

Steps:
1. Read the document: GET /api/ai/doc
2. Search for the content to modify: GET /api/ai/search?q=<relevant text>
3. Make targeted edits using the block IDs from search results
4. After each edit, verify by re-reading or searching — confirm no unintended changes
5. Report what you changed

Use the WebFetch tool for all API calls. Include the Authorization header on every request.
```
