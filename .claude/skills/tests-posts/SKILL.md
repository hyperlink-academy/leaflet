---
name: tests-posts
description: Generate a manual preview/test harness page for the post-item list components. Use when you want to visually preview PublicationPostItem Small/Medium/Large across the PostsListBlock, StandardSitePostBlock, and reader feed layouts, with toggles for highlight-first-post, card border, cover image, publication footer, and a page-width slider.
user-invocable: true
---

# Posts List Test Harness

Scaffolds a client-side preview page that renders the three
`PublicationPostItem` leaf components (`Small` / `Medium` / `Large`) driven by
fake data, so every size / highlight / layout variant can be eyeballed without
the Replicache / SWR provider stack.

## What to produce

Create `app/test/posts/page.tsx` (a folder called `posts` under `app/test/`)
with the exact contents in **Reference implementation** below. The page is a
self-contained `"use client"` component — no routing or data fetching required.
Visit it at `/test/posts`.

If the file already exists, overwrite it so it matches the reference verbatim.

## Structure

The page is organized into three sections, each with its own controls row:

- **PostsListBlock** — mirrors `PublicationPostsList`. Page-width slider +
  "Highlight First Post" toggle (first post renders `large`, the rest follow
  `view`). Shows `Medium` and `Small` list variants.
- **StandardSitePostBlock** — mirrors `StandardSitePostItemView` for a single
  post with the publication footer. Page-width slider + "Card Border Hidden"
  toggle. Shows `Large`, `Medium`, and `Small`.
- **Reader Post Link** — mirrors the reader feed's `PostListing` card. Page-width
  slider + "Selected" / "Cover Image" / "Publication Footer" toggles.

## Source components

- `app/(app)/lish/[did]/[publication]/PublicationPostItem` exports
  `PublicationPostItemSmall`, `PublicationPostItemMedium`, and
  `PublicationPostItemLarge`.
- Icons come from `components/Icons/`: `CommentTiny`, `TagTiny`, `ShareTiny`,
  `ExternalLinkTiny`, `RecommendTinyEmpty`.

## How the mock works

`FAKE_POSTS` is a small array of `FakePost` records (title, description, author,
date, optional cover image, comment count, tags) that exercises the edge cases —
one post with no cover image and no interactions, one with several tags.

The real list components consume `<InteractionPreview>` and `PubIcon`, which drag
in Replicache and the toast/recommend stack. `FakeInteractions` and `FakeFooter`
mirror their visual shape with plain markup so nothing needs the provider tree.
`ReaderPostLink` likewise reproduces `PostListing`'s markup directly rather than
importing it.

`PublicationPostItemLarge` uses `pageWidth` to decide between its wide
(side-by-side) and stacked layouts — `>= 768` triggers the wide layout — so each
section drives it with the page-width slider and renders inside a `Variant` box
sized to that width (capped to the viewport).

## Reference implementation

Write `app/test/posts/page.tsx` with exactly this:

```tsx
"use client";
import React, { useState } from "react";
import {
  PublicationPostItemSmall,
  PublicationPostItemMedium,
  PublicationPostItemLarge,
} from "app/(app)/lish/[did]/[publication]/PublicationPostItem";
import { CommentTiny } from "components/Icons/CommentTiny";
import { TagTiny } from "components/Icons/TagTiny";
import { ShareTiny } from "components/Icons/ShareTiny";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { RecommendTinyEmpty } from "components/Icons/RecommendTiny";

// PostsListBlock (-> PublicationPostsList) and StandardSitePostBlock
// (-> StandardSitePostItemView) both render through these same three leaf
// item components. Driving them with fake data here previews every size/
// highlight variant without the Replicache / SWR provider stack.

// >= 768 triggers the wide (side-by-side) "large" layout; below that it stacks.
const DEFAULT_PAGE_WIDTH = 768;

type FakePost = {
  title: string;
  description: string;
  author: string;
  date: string;
  coverImageSrc?: string;
  comments: number;
  tags: string[];
};

const FAKE_POSTS: FakePost[] = [
  {
    title: "The Quiet Architecture of Everyday Tools",
    description:
      "How the most useful software disappears into habit — and why designing for that invisibility is harder than it looks.",
    author: "rose.bsky.social",
    date: "June 12, 2026",
    coverImageSrc: "/imagePlaceholder.png",
    comments: 12,
    tags: ["design", "tools"],
  },
  {
    title: "Notes From a Slow Garden",
    description:
      "A season of letting things grow on their own schedule, and what the weeds taught me about patience.",
    author: "mateo.bsky.social",
    date: "June 9, 2026",
    coverImageSrc: "/imagePlaceholder.png",
    comments: 3,
    tags: ["essays"],
  },
  {
    title: "On Reading Without a Goal",
    description:
      "Reclaiming the wandering, purposeless kind of reading in an age of optimization.",
    author: "june.bsky.social",
    date: "June 2, 2026",
    comments: 0,
    tags: [],
  },
  {
    title: "A Short History of the Footnote",
    description:
      "The humble aside has carried gossip, dissent, and entire arguments. A look at its many lives.",
    author: "ari.bsky.social",
    date: "May 28, 2026",
    coverImageSrc: "/imagePlaceholder.png",
    comments: 7,
    tags: ["history", "writing", "typography"],
  },
];

// A lightweight stand-in for <InteractionPreview> — same visual shape (recommend
// / comment counts + tag count) without pulling in Replicache and the toast/
// recommend stack.
function FakeInteractions(props: { comments: number; tags: string[] }) {
  if (props.comments === 0 && props.tags.length === 0) return null;
  return (
    <div className="flex gap-2 text-tertiary text-sm items-center">
      {props.comments > 0 && (
        <span className="flex flex-row gap-1 items-center">
          <CommentTiny /> {props.comments}
        </span>
      )}
      {props.tags.length > 0 && (
        <span className="flex gap-1 items-center">
          <TagTiny /> {props.tags.length}
        </span>
      )}
    </div>
  );
}

// Mirrors StandardSitePostItemView's PubFooter without PubIcon's data deps.
function FakeFooter() {
  return (
    <div className="flex items-center gap-1.5 text-accent-contrast font-bold text-sm">
      <div className="w-3 h-3 rounded-full rounded-sm bg-accent-1 shrink-0" />
      <span className="min-w-0 truncate">Test Publication</span>
    </div>
  );
}

type ListView = "small" | "medium";

// Reproduces PublicationPostsList's variant mapping: the first post becomes a
// "large" item when highlightFirstPost is on, everything else follows `view`.
function PostsList(props: {
  view: ListView;
  highlightFirstPost: boolean;
  pageWidth: number;
}) {
  return (
    <div className="publicationPostList w-full flex flex-col gap-2">
      {FAKE_POSTS.map((post, index) => {
        const isHighlightedFirst = props.highlightFirstPost && index === 0;
        const variant = isHighlightedFirst
          ? "large"
          : props.view === "small"
            ? "small"
            : "medium";
        const interactions = (
          <FakeInteractions comments={post.comments} tags={post.tags} />
        );

        let item: React.ReactNode;
        if (variant === "large") {
          item = (
            <PublicationPostItemLarge
              inList
              title={post.title}
              description={post.description}
              author={post.author}
              date={post.date}
              interactions={interactions}
              coverImageSrc={post.coverImageSrc}
              coverImageAlt={post.title}
              pageWidth={props.pageWidth}
            />
          );
        } else if (variant === "small") {
          item = (
            <PublicationPostItemSmall
              inList
              title={post.title}
              author={post.author}
              date={post.date}
              interactions={interactions}
            />
          );
        } else {
          item = (
            <PublicationPostItemMedium
              inList
              title={post.title}
              description={post.description}
              author={post.author}
              date={post.date}
              interactions={interactions}
              coverImageSrc={post.coverImageSrc}
              coverImageAlt={post.title}
            />
          );
        }

        return (
          <React.Fragment key={index}>
            {item}
            <hr className="last:hidden border-border-light" />
          </React.Fragment>
        );
      })}
    </div>
  );
}

type PostSize = "large" | "medium" | "small";

// Reproduces StandardSitePostItemView for a single post (with the publication
// footer), wrapped in card chrome that responds to the cardBorderHidden toggle.
function StandardSitePost(props: {
  size: PostSize;
  cardBorderHidden: boolean;
  pageWidth: number;
}) {
  const post = FAKE_POSTS[0];
  const interactions = (
    <FakeInteractions comments={post.comments} tags={post.tags} />
  );
  const pubInfo = <FakeFooter />;

  let item: React.ReactNode;
  if (props.size === "large") {
    item = (
      <PublicationPostItemLarge
        title={post.title}
        description={post.description}
        author={post.author}
        date={post.date}
        interactions={interactions}
        pubInfo={pubInfo}
        coverImageSrc={post.coverImageSrc}
        coverImageAlt={post.title}
        pageWidth={props.pageWidth}
      />
    );
  } else if (props.size === "small") {
    item = (
      <PublicationPostItemSmall
        title={post.title}
        author={post.author}
        date={post.date}
        interactions={interactions}
        pubInfo={pubInfo}
      />
    );
  } else {
    item = (
      <PublicationPostItemMedium
        title={post.title}
        description={post.description}
        author={post.author}
        date={post.date}
        interactions={interactions}
        pubInfo={pubInfo}
        coverImageSrc={post.coverImageSrc}
        coverImageAlt={post.title}
      />
    );
  }

  return (
    <div
      className={
        props.cardBorderHidden
          ? "bg-transparent"
          : "bg-bg-page border border-border-light rounded-lg"
      }
    >
      {item}
    </div>
  );
}

// Reproduces the reader feed's <PostListing> card: cover image on top, then
// title / description, a publication footer, and a byline + interactions row.
// The real component drags in theme providers, toasts, and the recommend/
// replicache stack, so this mirrors its markup with fake data.
function ReaderPostLink(props: {
  selected: boolean;
  coverImage: boolean;
  publicationFooter: boolean;
}) {
  const post = FAKE_POSTS[0];
  return (
    <div className="postListing flex flex-col gap-1">
      <div
        className={`relative flex flex-col overflow-hidden rounded-lg w-full border bg-bg-page ${
          props.selected
            ? "outline-2 outline-offset-1 outline-accent-contrast border-accent-contrast"
            : "hover:outline-accent-contrast hover:border-accent-contrast border-border-light"
        }`}
      >
        {props.coverImage && (
          <div className="postListingImage">
            <img
              src={post.coverImageSrc}
              alt={post.title}
              className="w-full h-auto aspect-video object-cover object-top-left rounded"
            />
          </div>
        )}
        <div className="postListingInfo px-3 py-2">
          <h3 className="postListingTitle text-primary line-clamp-2 sm:text-lg text-base pb-0.5">
            {post.title}
          </h3>
          <p className="postListingDescription text-secondary line-clamp-3 leading-snug sm:text-base text-sm">
            {post.description}
          </p>
          <div className="flex flex-col-reverse gap-2 text-sm text-tertiary items-center justify-start pt-1.5 w-full">
            {props.publicationFooter && (
              <div className="flex flex-col shrink-0 w-full">
                <hr className="block border-border-light mb-1" />
                <div className="flex justify-between gap-4 w-full">
                  <span className="text-accent-contrast font-bold text-sm flex gap-[6px] items-center grow w-max shrink-0 min-w-0">
                    <span className="w-4 h-4 rounded-sm bg-accent-1 shrink-0" />
                    <span className="w-max min-w-0">Test Publication</span>
                  </span>
                  <span className="text-sm flex flex-row items-center text-tertiary gap-1 min-w-0">
                    <span className="truncate min-w-0">
                      example.leaflet.pub
                    </span>
                    <ExternalLinkTiny className="shrink-0" />
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-row justify-between gap-2 text-xs items-center w-full">
              <div className="flex flex-row flex-wrap items-center gap-1 text-tertiary min-w-0">
                <span>{post.author}</span>
                <span>·</span>
                <span className="shrink-0 sm:text-sm text-xs">{post.date}</span>
              </div>
              {post.tags.length > 0 && (
                <span className="flex gap-1 items-center">
                  <TagTiny /> {post.tags.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm flex justify-between text-tertiary">
        <div className="postListingsInteractions flex gap-3 px-1 items-center">
          <span className="flex gap-1 items-center">
            <RecommendTinyEmpty /> 4
          </span>
          {post.comments > 0 && (
            <span className="flex flex-row gap-1 items-center">
              <CommentTiny /> {post.comments}
            </span>
          )}
        </div>
        <span className="flex gap-1 items-center font-bold">
          Share <ShareTiny />
        </span>
      </div>
    </div>
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-secondary select-none">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label}
    </label>
  );
}

function PageWidthSlider(props: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-secondary select-none">
      page width
      <input
        type="range"
        min={320}
        max={1024}
        step={8}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className="tabular-nums text-tertiary w-12">{props.value}px</span>
    </label>
  );
}

function Variant(props: {
  label: string;
  pageWidth: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-tertiary uppercase text-xs font-bold tracking-wide">
        {props.label}
      </h3>
      {/* The box renders at the chosen page width so the layout reflects how
          the block actually looks at that width (capped to the viewport). */}
      <div
        className="border border-border rounded-md p-4"
        style={{ width: props.pageWidth, maxWidth: "100%" }}
      >
        {props.children}
      </div>
    </div>
  );
}

export default function PostsPreviewPage() {
  let [highlightFirstPost, setHighlightFirstPost] = useState(false);
  let [cardBorderHidden, setCardBorderHidden] = useState(false);
  let [postsListPageWidth, setPostsListPageWidth] =
    useState(DEFAULT_PAGE_WIDTH);
  let [standardSitePageWidth, setStandardSitePageWidth] =
    useState(DEFAULT_PAGE_WIDTH);
  let [readerSelected, setReaderSelected] = useState(false);
  let [readerCoverImage, setReaderCoverImage] = useState(true);
  let [readerPublicationFooter, setReaderPublicationFooter] = useState(true);
  let [readerPageWidth, setReaderPageWidth] = useState(360);

  return (
    <div className="max-w-[1024px] mx-auto flex flex-col gap-12 p-6">
      <h1>Posts List & Standard Site Post Variants</h1>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap border-b border-border-light pb-2">
          <h2 className="grow">PostsListBlock</h2>
          <PageWidthSlider
            value={postsListPageWidth}
            onChange={setPostsListPageWidth}
          />
          <Toggle
            label="Highlight First Post"
            checked={highlightFirstPost}
            onChange={setHighlightFirstPost}
          />
        </div>
        <Variant label="Medium" pageWidth={postsListPageWidth}>
          <PostsList
            view="medium"
            highlightFirstPost={highlightFirstPost}
            pageWidth={postsListPageWidth}
          />
        </Variant>
        <Variant label="Small" pageWidth={postsListPageWidth}>
          <PostsList
            view="small"
            highlightFirstPost={highlightFirstPost}
            pageWidth={postsListPageWidth}
          />
        </Variant>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap border-b border-border-light pb-2">
          <h2 className="grow">StandardSitePostBlock</h2>
          <PageWidthSlider
            value={standardSitePageWidth}
            onChange={setStandardSitePageWidth}
          />
          <Toggle
            label="Card Border Hidden"
            checked={cardBorderHidden}
            onChange={setCardBorderHidden}
          />
        </div>
        <Variant label="Large" pageWidth={standardSitePageWidth}>
          <StandardSitePost
            size="large"
            cardBorderHidden={cardBorderHidden}
            pageWidth={standardSitePageWidth}
          />
        </Variant>
        <Variant label="Medium" pageWidth={standardSitePageWidth}>
          <StandardSitePost
            size="medium"
            cardBorderHidden={cardBorderHidden}
            pageWidth={standardSitePageWidth}
          />
        </Variant>
        <Variant label="Small" pageWidth={standardSitePageWidth}>
          <StandardSitePost
            size="small"
            cardBorderHidden={cardBorderHidden}
            pageWidth={standardSitePageWidth}
          />
        </Variant>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap border-b border-border-light pb-2">
          <h2 className="grow">Reader Post Link</h2>
          <PageWidthSlider
            value={readerPageWidth}
            onChange={setReaderPageWidth}
          />
          <Toggle
            label="Selected"
            checked={readerSelected}
            onChange={setReaderSelected}
          />
          <Toggle
            label="Cover Image"
            checked={readerCoverImage}
            onChange={setReaderCoverImage}
          />
          <Toggle
            label="Publication Footer"
            checked={readerPublicationFooter}
            onChange={setReaderPublicationFooter}
          />
        </div>
        <Variant label="Post Listing" pageWidth={readerPageWidth}>
          <ReaderPostLink
            selected={readerSelected}
            coverImage={readerCoverImage}
            publicationFooter={readerPublicationFooter}
          />
        </Variant>
      </section>
    </div>
  );
}
```
