## Page System Implementation Summary

### Overview
The page system allows documents to contain multiple linked "sub-pages" (either **Linear Documents** or **Canvas pages**) that can be opened inline within the main document view.

### State Management

**Zustand Store** (`PostPages.tsx:28-31`):
```typescript
const usePostPageUIState = create(() => ({
  pages: [] as string[],    // Array of open page IDs
  initialized: false,       // Whether initial state was set
}));
```

### Hooks

| Hook | Purpose |
|------|---------|
| `useOpenPages()` | Returns array of currently open page IDs. Falls back to URL params (`?page=` or quote position) if not initialized |
| `useInitializeOpenPages()` | Effect hook that initializes page state from URL search params or quote position on mount |

### Actions

| Action | Behavior |
|--------|----------|
| `openPage(parent, pageId, options?)` | Opens a page after the parent in the stack. Uses `flushSync` for immediate DOM update, then scrolls to page |
| `closePage(pageId)` | Closes the page and all pages after it in the stack (breadcrumb-style navigation) |

### Key Components

**`PostPages`** (`PostPages.tsx:167-301`):
- Main container that renders the first page and all open sub-pages
- Maps through `openPageIds` to render each open page with `<PageRenderer>`
- Adds `<InteractionDrawer>` (comments/quotes) contextually for each page
- Inserts `<SandwichSpacer>` between pages

**`PageRenderer`** (`PostPages.tsx:141-165`):
- Dispatches to either `<CanvasPage>` or `<LinearDocumentPage>` based on page type

**`PostContent`** (`PostContent.tsx:38-83`):
- Renders an array of blocks for linear documents
- Uses a `<Block>` component with a large switch statement to render each block type

**`Block`** (`PostContent.tsx:85-402`):
- Handles rendering of 15+ block types (text, headers, images, code, lists, embeds, etc.)
- For **page link blocks** (`PubLeafletBlocksPage`), renders `<PublishedPageLinkBlock>`

**`PublishedPageLinkBlock`** (`PublishedPageBlock.tsx:29-79`):
- Renders a clickable card preview of a linked page
- On click, calls `openPage(parentPageId, pageId)` to open the sub-page inline
- Shows visual indicator (`!border-tertiary`) when the page is already open
- Displays interaction counts (comments/quotes) that also trigger page open

### Navigation Flow

1. User clicks a page link block in `PostContent`
2. `PublishedPageLinkBlock.onClick` → `openPage(parent, pageId)`
3. Zustand state updates with new page in `pages` array
4. `PostPages` re-renders, mapping new page to `<PageRenderer>`
5. `scrollIntoView` scrolls to the newly opened page
6. Close button (via `<PageOptions>`) calls `closePage(pageId)` to remove from stack
