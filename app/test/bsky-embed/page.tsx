"use client";
import { useState } from "react";
import { AppBskyFeedDefs } from "@atproto/api";
import { BskyEmbed } from "components/Blocks/BlueskyPostBlock/BskyEmbed";

// Manual preview harness for BskyEmbed — the shared bluesky embed renderer used
// by both the reader (BlueskyEmbed) and the compose card (BlueskyPostComposer).
// Renders every embed case against fake view objects so the layout can be
// eyeballed without the Replicache / drawer provider stack. Visit /test/bsky-embed.

type Embed = AppBskyFeedDefs.PostView["embed"];
// The embed view unions are huge; the fakes below are structurally what the
// runtime type guards check ($type + the fields each case reads), so cast.
const e = (o: unknown): Embed => o as Embed;

const img = (seed: string, w = 900, h = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const author = {
  did: "did:plc:examplealice",
  handle: "alice.bsky.social",
  displayName: "Alice Example",
  avatar: img("alice", 120, 120),
  labels: [],
};

const images = (n: number) =>
  e({
    $type: "app.bsky.embed.images#view",
    images: Array.from({ length: n }, (_, i) => ({
      thumb: img(`img${n}-${i}`),
      fullsize: img(`img${n}-${i}`, 1600, 1200),
      alt: `Image ${i + 1}`,
      aspectRatio: { width: 3, height: 2 },
    })),
  });

const external = (opts: { thumb?: boolean } = {}) =>
  e({
    $type: "app.bsky.embed.external#view",
    external: {
      uri: "https://leaflet.pub/some-really-long-post-slug-that-truncates",
      title: "An external link card title that is long enough to clamp",
      description:
        "A description for the external link card. It should clamp to two lines once it gets long enough to wrap onto a third line and beyond.",
      thumb: opts.thumb ? img("external", 1200, 630) : undefined,
    },
  });

const viewRecord = (extra: Record<string, unknown> = {}) => ({
  $type: "app.bsky.embed.record#viewRecord",
  uri: "at://did:plc:examplealice/app.bsky.feed.post/abc123",
  cid: "bafyreibexamplecid",
  author,
  value: {
    $type: "app.bsky.feed.post",
    text: "This is the quoted post's text — short and sweet.",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  labels: [],
  likeCount: 12,
  replyCount: 3,
  repostCount: 1,
  indexedAt: "2024-01-01T00:00:00.000Z",
  ...extra,
});

const quote = (extra?: Record<string, unknown>) =>
  e({ $type: "app.bsky.embed.record#view", record: viewRecord(extra) });

const recordView = ($type: string, record: Record<string, unknown>) =>
  e({ $type: "app.bsky.embed.record#view", record: { $type, ...record } });

const creator = {
  did: "did:plc:examplealice",
  handle: "alice.bsky.social",
  displayName: "Alice Example",
  avatar: img("creator", 120, 120),
};

type Variant = {
  label: string;
  content: Embed;
  note?: string;
};

const VARIANTS: Variant[] = [
  { label: "Image ×1", content: images(1) },
  { label: "Image ×2", content: images(2) },
  { label: "Image ×3", content: images(3) },
  { label: "Image ×4", content: images(4) },
  { label: "Image ×5 (overflow +1)", content: images(5) },
  { label: "External (with thumb)", content: external({ thumb: true }) },
  { label: "External (no thumb)", content: external() },
  {
    label: "Quote — short",
    content: quote(),
    note: "Reader mode → button (opens drawer). Composer mode → link to bsky.",
  },
  {
    label: "Quote — long text",
    content: quote({
      value: {
        $type: "app.bsky.feed.post",
        text: "This quoted post has a much longer body so you can see how the text flows, and — in compact mode — how it clamps to six lines. ".repeat(
          4,
        ),
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    }),
  },
  {
    label: "Quote — with nested image",
    content: quote({
      embeds: [
        {
          $type: "app.bsky.embed.images#view",
          images: [
            {
              thumb: img("nested"),
              fullsize: img("nested", 1600, 1200),
              alt: "Nested",
              aspectRatio: { width: 3, height: 2 },
            },
          ],
        },
      ],
    }),
    note: "Nested media only shows in non-compact mode.",
  },
  {
    label: "Feed generator",
    content: recordView("app.bsky.feed.defs#generatorView", {
      uri: "at://did:plc:examplealice/app.bsky.feed.generator/whats-hot",
      cid: "bafyfeed",
      did: "did:web:feedgen.example",
      creator,
      displayName: "What's Hot",
      likeCount: 4200,
      indexedAt: "2024-01-01T00:00:00.000Z",
    }),
  },
  {
    label: "List",
    content: recordView("app.bsky.graph.defs#listView", {
      uri: "at://did:plc:examplealice/app.bsky.graph.list/cool-people",
      cid: "bafylist",
      creator,
      name: "Cool People",
      purpose: "app.bsky.graph.defs#curatelist",
      description: "A curated list of cool people to follow.",
      avatar: img("list", 120, 120),
      indexedAt: "2024-01-01T00:00:00.000Z",
    }),
  },
  {
    label: "Starter pack",
    content: recordView("app.bsky.graph.defs#starterPackViewBasic", {
      uri: "at://did:plc:examplealice/app.bsky.graph.starterpack/xyz",
      cid: "bafysp",
      creator,
      joinedAllTimeCount: 128,
      record: {
        $type: "app.bsky.graph.starterpack",
        name: "New to Bluesky",
        description: "A starter pack to get you going.",
        list: "at://did:plc:examplealice/app.bsky.graph.list/sp",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      indexedAt: "2024-01-01T00:00:00.000Z",
    }),
    note: "og-card image 404s off-network; card layout is what matters.",
  },
  {
    label: "Video",
    content: e({
      $type: "app.bsky.embed.video#view",
      cid: "bafyvideo",
      playlist: "https://example.com/does-not-exist/playlist.m3u8",
      thumbnail: img("video", 1280, 720),
      alt: "A video",
      aspectRatio: { width: 16, height: 9 },
    }),
    note: "Thumbnail + play button; won't actually play (dummy playlist).",
  },
  {
    label: "Record + media (image + quote)",
    content: e({
      $type: "app.bsky.embed.recordWithMedia#view",
      media: {
        $type: "app.bsky.embed.images#view",
        images: [
          {
            thumb: img("rwm"),
            fullsize: img("rwm", 1600, 1200),
            alt: "Media",
            aspectRatio: { width: 3, height: 2 },
          },
        ],
      },
      record: {
        $type: "app.bsky.embed.record#view",
        record: viewRecord(),
      },
    }),
  },
  {
    label: "Quote — blocked",
    content: recordView("app.bsky.embed.record#viewBlocked", {
      uri: "at://did:plc:examplealice/app.bsky.feed.post/blocked",
      blocked: true,
      author: { did: "did:plc:blocked", viewer: { blocking: true } },
    }),
  },
  {
    label: "Quote — not found",
    content: recordView("app.bsky.embed.record#viewNotFound", {
      uri: "at://did:plc:examplealice/app.bsky.feed.post/gone",
      notFound: true,
    }),
  },
  {
    label: "Unknown embed type",
    content: e({ $type: "app.bsky.embed.somethingNew#view" }),
    note: "Reader (postUrl set) → 'See full post'. Composer → nothing.",
  },
];

export default function BskyEmbedTestPage() {
  const [width, setWidth] = useState(360);
  const [compact, setCompact] = useState(false);
  const [readerMode, setReaderMode] = useState(true);
  const [lastClick, setLastClick] = useState<string | null>(null);

  return (
    <div className="p-6 flex flex-col gap-4 min-h-screen bg-bg-page">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">BskyEmbed preview harness</h1>
        <p className="text-sm text-tertiary">
          The shared embed renderer used by the reader (
          <code>BlueskyEmbed</code>) and the compose card (
          <code>BlueskyPostComposer</code>).
        </p>
      </div>

      <div className="flex flex-wrap gap-6 items-center sticky top-0 bg-bg-page py-3 border-b border-border-light z-10">
        <label className="flex items-center gap-2 text-sm">
          Width
          <input
            type="range"
            min={220}
            max={680}
            value={width}
            onChange={(ev) => setWidth(Number(ev.target.value))}
          />
          <span className="tabular-nums text-tertiary w-10">{width}px</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={compact}
            onChange={(ev) => setCompact(ev.target.checked)}
          />
          Compact
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={readerMode}
            onChange={(ev) => setReaderMode(ev.target.checked)}
          />
          Reader mode (quotes open drawer, unsupported → “See full post”)
        </label>
        {lastClick && (
          <span className="text-sm text-accent-contrast">
            onQuoteClick → {lastClick}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        {VARIANTS.map((v) => (
          <div key={v.label} className="flex flex-col gap-1.5">
            <div className="text-sm font-bold">{v.label}</div>
            {v.note && (
              <div className="text-xs text-tertiary max-w-[var(--w)] [width:var(--w)]">
                {v.note}
              </div>
            )}
            <div
              className="border border-dashed border-border rounded-lg p-3 bg-bg-page"
              style={{ width, maxWidth: "100%" }}
            >
              <div className="text-sm text-secondary">
                <BskyEmbed
                  content={v.content}
                  compact={compact}
                  postUrl={
                    readerMode
                      ? "https://bsky.app/profile/alice.bsky.social/post/abc123"
                      : undefined
                  }
                  className="text-sm"
                  onQuoteClick={
                    readerMode ? (uri) => setLastClick(uri) : undefined
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
