# Lexicon System

## Overview

Lexicons define the schema for AT Protocol records. This project has two namespaces:
- **`pub.leaflet.*`** - Leaflet-specific lexicons (documents, publications, blocks, etc.)
- **`site.standard.*`** - Standard site lexicons for interoperability

The lexicons are defined as TypeScript in `lexicons/src/`, built to JSON in `lexicons/pub/leaflet/` and `lexicons/site/standard/`, and TypeScript types are generated in `lexicons/api/`.

## Key Files

- **`lexicons/src/*.ts`** - Source definitions for `pub.leaflet.*` lexicons
- **`lexicons/site/standard/**/*.json`** - JSON definitions for `site.standard.*` lexicons (manually maintained)
- **`lexicons/build.ts`** - Builds TypeScript sources to JSON
- **`lexicons/api/`** - Generated TypeScript types and client
- **`package.json`** - Contains `lexgen` script

## Running Lexicon Generation

```bash
npm run lexgen
```

This runs:
1. `tsx ./lexicons/build.ts` - Builds `pub.leaflet.*` JSON from TypeScript
2. `lex gen-api` - Generates TypeScript types from all JSON lexicons
3. `tsx ./lexicons/fix-extensions.ts` - Fixes import extensions

## Adding a New pub.leaflet Lexicon

### 1. Create the Source Definition

Create a file in `lexicons/src/` (e.g., `lexicons/src/myLexicon.ts`):

```typescript
import { LexiconDoc } from "@atproto/lexicon";

export const PubLeafletMyLexicon: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.myLexicon",
  defs: {
    main: {
      type: "record",  // or "object" for non-record types
      key: "tid",
      record: {
        type: "object",
        required: ["field1"],
        properties: {
          field1: { type: "string", maxLength: 1000 },
          field2: { type: "integer", minimum: 0 },
          optionalRef: { type: "ref", ref: "other.lexicon#def" },
        },
      },
    },
    // Additional defs for sub-objects
    subType: {
      type: "object",
      properties: {
        nested: { type: "string" },
      },
    },
  },
};
```

### 2. Add to Build

Update `lexicons/build.ts`:

```typescript
import { PubLeafletMyLexicon } from "./src/myLexicon";

const lexicons = [
  // ... existing lexicons
  PubLeafletMyLexicon,
];
```

### 3. Update lexgen Command (if needed)

If your lexicon is at the top level of `pub/leaflet/` (not in a subdirectory), add it to the `lexgen` script in `package.json`:

```json
"lexgen": "tsx ./lexicons/build.ts && lex gen-api ./lexicons/api ./lexicons/pub/leaflet/document.json ./lexicons/pub/leaflet/myLexicon.json ./lexicons/pub/leaflet/*/* ..."
```

Note: Files in subdirectories (`pub/leaflet/*/*`) are automatically included.

### 4. Regenerate Types

```bash
npm run lexgen
```

### 5. Use the Generated Types

```typescript
import { PubLeafletMyLexicon } from "lexicons/api";

// Type for the record
type MyRecord = PubLeafletMyLexicon.Record;

// Validation
const result = PubLeafletMyLexicon.validateRecord(data);
if (result.success) {
  // result.value is typed
}

// Type guard
if (PubLeafletMyLexicon.isRecord(data)) {
  // data is typed as Record
}
```

## Adding a New site.standard Lexicon

### 1. Create the JSON Definition

Create a file in `lexicons/site/standard/` (e.g., `lexicons/site/standard/myType.json`):

```json
{
  "lexicon": 1,
  "id": "site.standard.myType",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["field1"],
        "properties": {
          "field1": {
            "type": "string",
            "maxLength": 1000
          }
        }
      }
    }
  }
}
```

### 2. Regenerate Types

```bash
npm run lexgen
```

The `site/*/* site/*/*/*` globs in the lexgen command automatically pick up new files.

## Common Lexicon Patterns

### Referencing Other Lexicons

```typescript
// Reference another lexicon's main def
{ type: "ref", ref: "pub.leaflet.publication" }

// Reference a specific def within a lexicon
{ type: "ref", ref: "pub.leaflet.publication#theme" }

// Reference within the same lexicon
{ type: "ref", ref: "#myDef" }
```

### Union Types

```typescript
{
  type: "union",
  refs: [
    "pub.leaflet.pages.linearDocument",
    "pub.leaflet.pages.canvas",
  ],
}

// Open union (allows unknown types)
{
  type: "union",
  closed: false,  // default is true
  refs: ["pub.leaflet.content"],
}
```

### Blob Types (for images/files)

```typescript
{
  type: "blob",
  accept: ["image/*"],  // or specific types like ["image/png", "image/jpeg"]
  maxSize: 1000000,  // bytes
}
```

### Color Types

The project has color types defined:
- `pub.leaflet.theme.color#rgb` / `#rgba`
- `site.standard.theme.color#rgb` / `#rgba`

```typescript
// In lexicons/src/theme.ts
export const ColorUnion = {
  type: "union",
  refs: [
    "pub.leaflet.theme.color#rgba",
    "pub.leaflet.theme.color#rgb",
  ],
};
```

## Normalization Between Formats

Use `lexicons/src/normalize.ts` to convert between `pub.leaflet` and `site.standard` formats:

```typescript
import {
  normalizeDocument,
  normalizePublication,
  isLeafletDocument,
  isStandardDocument,
  getDocumentPages,
} from "lexicons/src/normalize";

// Normalize a document from either format
const normalized = normalizeDocument(record);
if (normalized) {
  // normalized is always in site.standard.document format
  console.log(normalized.title, normalized.site);

  // Get pages if content is pub.leaflet.content
  const pages = getDocumentPages(normalized);
}

// Normalize a publication
const pub = normalizePublication(record);
if (pub) {
  console.log(pub.name, pub.url);
}
```

## Handling in Appview (Firehose Consumer)

When processing records from the firehose in `appview/index.ts`:

```typescript
import { ids } from "lexicons/api/lexicons";
import { PubLeafletMyLexicon } from "lexicons/api";

// In filterCollections:
filterCollections: [
  ids.PubLeafletMyLexicon,
  // ...
],

// In handleEvent:
if (evt.collection === ids.PubLeafletMyLexicon) {
  if (evt.event === "create" || evt.event === "update") {
    let record = PubLeafletMyLexicon.validateRecord(evt.record);
    if (!record.success) return;

    // Store in database
    await supabase.from("my_table").upsert({
      uri: evt.uri.toString(),
      data: record.value as Json,
    });
  }
  if (evt.event === "delete") {
    await supabase.from("my_table").delete().eq("uri", evt.uri.toString());
  }
}
```

## Publishing Lexicons

To publish lexicons to an AT Protocol PDS:

```bash
npm run publish-lexicons
```

This runs `lexicons/publish.ts` which publishes lexicons to the configured PDS.
