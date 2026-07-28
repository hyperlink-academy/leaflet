# Merge Notes: main -> refactor/standard.site

## NEW: Main Branch Changes (since last merge b54c179b)

### Commits to merge:

1. **e13306ec** - Feature/backdate (#258)
   - **Goal**: Add capability to backdate posts on published documents
   - **Key changes**:
     - `actions/publishToPublication.ts`: Added `publishedAt` parameter, changed logic to use `publishedAt || existingRecord?.publishedAt || new Date().toISOString()` instead of spreading existing record first
     - `src/replicache/mutations.ts`: Added `localPublishedAt` to updatePublicationDraft mutation
     - New components: `DatePicker.tsx`, `Backdater.tsx`
     - Modified publish flow components

2. **08302114** - show mention and comments placeholder in looseleaf draft
   - **Goal**: Show mention/comments UI in looseleaf draft mode
   - **Key changes**:
     - `components/Pages/PublicationMetadata.tsx`: Changed condition logic

3. **18d880de** - fixing some color logic stuff
   - **Goal**: Simplify color contrast logic
   - **Key changes**:
     - `components/ThemeManager/PublicationThemeProvider.tsx`: Removed ~35 lines of complex accentContrast calculation logic
     - `components/ThemeManager/ThemeProvider.tsx`: Minor adjustments

4. **a355cc99** - add more resolution to timeAgo, show createdAt on comments
   - **Goal**: Better time display for comments
   - **Key changes**:
     - Comments component: Show createdAt
     - `src/utils/timeAgo.ts`: Add more resolution

5. **2c068aca** - oops fix showing quotes on interaction preview
   - **Goal**: Bug fix for quotes in interaction preview
   - **Key changes**:
     - `components/InteractionsPreview.tsx`: Fixed quote display

### Potential Conflict Areas:
- `components/Pages/PublicationMetadata.tsx` - Modified in both branches (08302114 on main, 82ef5ea2 on branch)
- `actions/publishToPublication.ts` - May have lexicon migration changes
- `src/replicache/mutations.ts` - Backdate feature adds localPublishedAt

### RESOLVED: Merge Commit f38d2745

**Conflicts resolved:**

1. **`actions/publishToPublication.ts`**:
   - Kept: Branch's normalization approach (`normalizeDocumentRecord`) for extracting existing record fields
   - Kept: Branch's dual-schema support (`site.standard.document` vs `pub.leaflet.document`)
   - Added: Main's backdate feature - `publishedAt` parameter support in both document formats
   - Resolution: `publishedAt || existingRecord.publishedAt || new Date().toISOString()` applied to both formats

2. **`components/Pages/PublicationMetadata.tsx`**:
   - Kept: Branch's `normalizedPublication` data structure
   - Adopted: Main's `!== false` pattern for `showMentions` and `showComments` (defaults to true when undefined)

**TypeScript verification**: Passed with no errors

---

## PREVIOUS: Main Branch Changes (since merge base 96ed3674)

### Commits:
1. **0920f639** - fixing firefox bugs causing mentions to wrap
   - File: `app/globals.css`
   - Goal: CSS fix for Firefox layout issue with mentions

2. **ebc99d35** - doing a pass to make the show mention, comment, and prev/next cleaner
   - Key change: Default `showPrevNext` to `true` instead of `false` in lexicon
   - Pattern change: Use `!== false` checks for boolean preferences (showComments, showMentions, showPrevNext)
     - This means undefined/null values now default to true (show by default)
   - Added: `PostSubscribe.tsx` component
   - Files affected: Interactions.tsx, LinearDocumentPage.tsx, PostHeader.tsx, Canvas.tsx, PostPrevNextButtons.tsx, PublishedPostsLists.tsx
   - Changed type: `showPrevNext: boolean | undefined` -> `showPrevNext: boolean`

3. **6c8a991c** - reverted the last change and redid it in a not stupid way
   - Files: Block.tsx, useBlockMouseHandlers.ts
   - Goal: Better mouse handling implementation

4. **10f4e467** - small adjustment for better scrolling on page focus
   - File: Block.tsx
   - Goal: UX improvement for scrolling

5. **24b0ad84** - lil typos
   - Minor fixes across several files

### Main Branch Key Changes Summary:
- **Boolean preference pattern**: `prop !== false` for showComments, showMentions, showPrevNext
- **showPrevNext default**: Changed from `false` to `true` in lexicon
- **PostPrevNextButtons props**: Type simplified from `boolean | undefined` to `boolean`
- **New component**: PostSubscribe.tsx added

---

## refactor/standard.site Branch Changes (since merge base 96ed3674)

### Goal: Migration to new site.standard lexicons

### Key Commits:
1. **27165915** - add basic site.standard stuff and normalization function
   - Added new lexicons: site/standard/document.json, site/standard/publication.json, etc.
   - Created normalization layer: `lexicons/src/normalize.ts`
   - Goal: Support both old `pub.leaflet.*` and new `site.standard.*` lexicons

2. **b9bc58cd** - normalize data from publication and document tables
   - Created `src/utils/normalizeRecords.ts`
   - Goal: Normalize records from either lexicon format

3. Various commits handling migration, themes, feed construction, etc.

### Branch Key Changes Summary:
- **New context hooks**: `useDocument()`, `useLeafletContent()` replacing direct PostPageContext usage
- **Normalization**: Records now accessed via `normalizedDocument`, `normalizedPublication`
- **Import changes**: Removed many direct `PubLeafletDocument`, `PubLeafletPublication` imports
- **Data access pattern**:
  - OLD: `document.data as PubLeafletDocument.Record`
  - NEW: `document.normalizedDocument` or via context hooks

---

## Conflict Resolution Strategy

### File: PostPrevNextButtons.tsx
- **Main**: Changed props type from `boolean | undefined` to `boolean`
- **Branch**: Changed to use `useDocument()` context, kept `boolean | undefined`
- **Resolution**: Keep branch's context usage, but adopt main's `!== false` pattern to handle undefined gracefully, OR keep the simpler boolean type if the context guarantees a value

### File: PostHeader.tsx
- **Main**: Changed to `showComments !== false` and `showMentions !== false`
- **Branch**: Changed data access to `normalizedDocument`, changed quote/comment count functions
- **Resolution**: Keep branch's normalization changes, apply main's `!== false` pattern

### File: LinearDocumentPage.tsx
- **Main**: Added PostSubscribe, changed to `!== false` checks, removed console.log
- **Branch**: Changed to use `useLeafletContent()` context, changed count functions
- **Resolution**: Keep branch's context usage, add PostSubscribe from main, apply `!== false` pattern, remove console.log

### File: PublishedPostsLists.tsx
- **Main**: Changed to `!== false` checks
- **Branch**: Major refactor to use normalized data, extracted PublishedPostItem component
- **Resolution**: Keep branch's refactor, apply main's `!== false` pattern

### File: Canvas.tsx
- **Main**: Changed to `!== false` checks
- **Branch**: Changed to use `normalizedPublication` from context
- **Resolution**: Keep branch's normalization, apply main's `!== false` pattern

### File: ProfileHeader.tsx
- **Main**: Added KnownFollowers component, CSS class additions, console.log, layout changes
- **Branch**: Changed to use NormalizedPublication type, changed href to record.url
- **Resolution**: Keep branch's type changes, adopt main's UI improvements and KnownFollowers

---

## Post-Merge Verification Checklist:
- [x] showComments/showMentions/showPrevNext default to true (via `!== false` or type change)
- [x] Normalized data access is preserved (useDocument, normalizedDocument, etc.)
- [x] PostSubscribe component is included
- [x] KnownFollowers component is included
- [x] Firefox CSS fix is included
- [x] Block scrolling/mouse handler improvements are included (from main)
